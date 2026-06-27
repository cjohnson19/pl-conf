import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset, Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import type { Construct } from "constructs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PlConfStackProps extends cdk.StackProps {
  stage: string;
  notificationEmail: string;
  domainName?: string;
  submissionApiUrl?: string;
}

export class PlConfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlConfStackProps) {
    super(scope, id, props);

    const { stage, notificationEmail, domainName, submissionApiUrl } = props;
    const isProduction = stage === "production";

    let certificate: acm.ICertificate | undefined;
    let hostedZone: route53.IHostedZone | undefined;
    let domainNames: string[] | undefined;

    if (isProduction && domainName) {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName,
      });

      certificate = new acm.Certificate(this, "SiteCertificate", {
        domainName,
        subjectAlternativeNames: [`www.${domainName}`],
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });

      domainNames = [domainName, `www.${domainName}`];
    }

    const driftSnapshotsBucket = new s3.Bucket(this, "DriftSnapshots", {
      versioned: true,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });

    const rateLimitTable = new dynamodb.Table(this, "RateLimitTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const submissionFunction = new lambda.Function(this, "SubmissionFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../functions/dist/submission")
      ),
      timeout: cdk.Duration.seconds(30),
      environment: {
        RATE_LIMIT_TABLE_NAME: rateLimitTable.tableName,
        SUBMISSION_EMAIL_SENDER: `submissions-${stage}@pl-conferences.com`,
        NOTIFICATION_EMAIL: notificationEmail,
      },
    });

    rateLimitTable.grantReadWriteData(submissionFunction);
    submissionFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    const driftFunction = new lambda.Function(this, "DriftFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../functions/dist/drift")
      ),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        DRIFT_SNAPSHOTS_BUCKET_NAME: driftSnapshotsBucket.bucketName,
        NOTIFICATION_EMAIL: notificationEmail,
        DRIFT_EMAIL_SENDER: `drift-${stage}@pl-conferences.com`,
      },
    });

    driftSnapshotsBucket.grantReadWrite(driftFunction);
    driftFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    if (isProduction) {
      new events.Rule(this, "DriftCronRule", {
        schedule: events.Schedule.cron({ minute: "0", hour: "17" }), // Daily at 5 PM UTC
        targets: [new targets.LambdaFunction(driftFunction)],
      });
    }

    const submissionApi = new apigateway.HttpApi(this, "SubmissionApi", {
      corsPreflight: {
        allowOrigins: isProduction
          ? ["https://pl-conferences.com", "https://www.pl-conferences.com"]
          : ["*"],
        allowMethods: [
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type"],
      },
    });

    submissionApi.addRoutes({
      path: "/",
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        "SubmissionIntegration",
        submissionFunction
      ),
    });

    const cluster = new ecs.CfnCluster(this, "WebCluster", {
      capacityProviders: ["FARGATE"],
    });
    cluster.applyRemovalPolicy(
      isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    );

    const executionRole = new iam.Role(this, "WebExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    const infrastructureRole = new iam.Role(this, "WebInfrastructureRole", {
      assumedBy: new iam.ServicePrincipal("ecs.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSInfrastructureRoleforExpressGatewayServices"
        ),
      ],
    });

    // NEXT_PUBLIC_* env vars are inlined by Next at build time, so the value
    // must be available when Docker builds the image — runtime env on the
    // container is too late and the submission form would fall back to
    // `/api/submit` (which 404s through CloudFront). The deploy script
    // bootstraps this by reading the stack's SubmissionApiUrl output between
    // CDK passes on first deploy.
    const image = new DockerImageAsset(this, "WebImage", {
      directory: path.join(__dirname, "../../.."),
      file: "Dockerfile",
      platform: Platform.LINUX_AMD64,
      buildArgs: submissionApiUrl
        ? { NEXT_PUBLIC_SUBMISSION_API_URL: submissionApiUrl }
        : undefined,
    });

    const defaultVpc = ec2.Vpc.fromLookup(this, "DefaultVpc", {
      isDefault: true,
    });
    const gatewaySubnetIds = defaultVpc.publicSubnets
      .slice(0, 2)
      .map((subnet) => subnet.subnetId);

    const service = new ecs.CfnExpressGatewayService(this, "WebService", {
      cluster: cluster.attrArn,
      executionRoleArn: executionRole.roleArn,
      infrastructureRoleArn: infrastructureRole.roleArn,
      networkConfiguration: { subnets: gatewaySubnetIds },
      cpu: "512",
      memory: "1024",
      healthCheckPath: "/",
      primaryContainer: {
        image: image.imageUri,
        containerPort: 3000,
        environment: [
          { name: "NODE_ENV", value: "production" },
          { name: "PORT", value: "3000" },
          { name: "HOSTNAME", value: "0.0.0.0" },
          ...(submissionApiUrl
            ? [
                {
                  name: "NEXT_PUBLIC_SUBMISSION_API_URL",
                  value: submissionApiUrl,
                },
              ]
            : []),
        ],
      },
      scalingTarget: {
        minTaskCount: 1,
        maxTaskCount: isProduction ? 4 : 2,
      },
    });
    service.node.addDependency(cluster, executionRole, infrastructureRole);

    // `q` is intentionally excluded — search is filtered client-side, so every
    // search string should hit the same cached HTML.
    const filterQueryParams = ["c", "view", "tags"];
    // Next.js App Router RSC discriminators. The `RSC` header (and friends) is
    // how the origin distinguishes a client navigation fetch from a full HTML
    // request — strip it and every navigation degrades to an MPA reload.
    // Include them in the cache key so HTML and RSC payloads stay in separate
    // entries.
    const rscCacheHeaders = [
      "RSC",
      "Next-Router-State-Tree",
      "Next-Router-Prefetch",
      "Next-Router-Segment-Prefetch",
      "Next-Url",
    ];

    const htmlCachePolicy = new cloudfront.CachePolicy(
      this,
      "HtmlCachePolicy",
      {
        defaultTtl: cdk.Duration.seconds(60),
        minTtl: cdk.Duration.seconds(0),
        maxTtl: cdk.Duration.seconds(3600),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList(
          ...filterQueryParams
        ),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          ...rscCacheHeaders
        ),
      }
    );

    const htmlOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      "HtmlOriginRequestPolicy",
      {
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
        // `_rsc` is a cache-buster Next appends to RSC fetches; we don't want
        // it in the cache key (every navigation would miss) but the origin
        // still needs it forwarded.
        queryStringBehavior:
          cloudfront.OriginRequestQueryStringBehavior.allowList(
            ...filterQueryParams,
            "_rsc"
          ),
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.none(),
      }
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.HttpOrigin(service.attrEndpoint, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          readTimeout: cdk.Duration.seconds(30),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // The SSR origin only serves GETs; the submission API is a separate
        // Lambda not behind this distribution. Restricting methods here
        // removes a class of body-flooding attacks at the edge.
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: htmlCachePolicy,
        originRequestPolicy: htmlOriginRequestPolicy,
        compress: true,
      },
      domainNames,
      certificate,
      additionalBehaviors: {
        "/_next/static/*": {
          origin: new origins.HttpOrigin(service.attrEndpoint, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
      },
    });

    if (isProduction && hostedZone) {
      new route53.ARecord(this, "AliasRecord", {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(distribution)
        ),
      });

      new route53.ARecord(this, "WwwAliasRecord", {
        zone: hostedZone,
        recordName: "www",
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(distribution)
        ),
      });
    }

    new cdk.CfnOutput(this, "WebsiteUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID",
    });

    new cdk.CfnOutput(this, "ServiceEndpoint", {
      value: `https://${service.attrEndpoint}`,
      description: "ECS Express service endpoint (origin)",
    });

    new cdk.CfnOutput(this, "SubmissionApiUrl", {
      value: submissionApi.url!,
      description: "Submission API endpoint",
    });

    new cdk.CfnOutput(this, "DriftSnapshotsBucketName", {
      value: driftSnapshotsBucket.bucketName,
      description: "S3 bucket for drift snapshots",
    });
  }
}
