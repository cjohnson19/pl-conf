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
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { DockerImageAsset, Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as logs from "aws-cdk-lib/aws-logs";
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
        enabled: false, // temporarily paused; flip to re-enable the daily drift email
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

    // NEXT_PUBLIC_* env vars are inlined by Next at build time, so the value
    // must be available when Docker builds the image — runtime env on the
    // container is too late and the submission form would fall back to
    // `/api/submit` (which 404s through CloudFront). The deploy script
    // bootstraps this by reading the stack's SubmissionApiUrl output between
    // CDK passes on first deploy.
    const image = new DockerImageAsset(this, "WebImage", {
      directory: path.join(__dirname, "../../.."),
      file: "Dockerfile",
      platform: Platform.LINUX_ARM64,
      buildArgs: submissionApiUrl
        ? { NEXT_PUBLIC_SUBMISSION_API_URL: submissionApiUrl }
        : undefined,
    });

    const webLogGroup = new logs.LogGroup(this, "WebLogGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Express Mode's managed task definition doesn't expose runtimePlatform,
    // so we bring our own to run on ARM64 Fargate (~20% cheaper). Express
    // requires the container to be named "Main" with a single named TCP port
    // mapping and FARGATE compatibility.
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "WebTaskDefinition",
      {
        cpu: 256,
        memoryLimitMiB: 512,
        executionRole,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      }
    );

    taskDefinition.addContainer("Main", {
      containerName: "Main",
      image: ecs.ContainerImage.fromDockerImageAsset(image),
      portMappings: [
        { name: "web", containerPort: 3000, protocol: ecs.Protocol.TCP },
      ],
      environment: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "0.0.0.0",
        ...(submissionApiUrl
          ? { NEXT_PUBLIC_SUBMISSION_API_URL: submissionApiUrl }
          : {}),
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup: webLogGroup,
        streamPrefix: "web",
      }),
    });

    const defaultVpc = ec2.Vpc.fromLookup(this, "DefaultVpc", {
      isDefault: true,
    });
    const originSubnets = defaultVpc.publicSubnets.slice(0, 2);

    const webCluster = ecs.Cluster.fromClusterAttributes(
      this,
      "WebClusterRef",
      {
        clusterName: cluster.ref,
        vpc: defaultVpc,
      }
    );

    const webService = new ecs.FargateService(this, "WebFargateService", {
      cluster: webCluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnets: originSubnets },
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });
    webService.node.addDependency(cluster);

    const webScaling = webService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: isProduction ? 4 : 2,
    });
    webScaling.scaleOnCpuUtilization("Cpu", { targetUtilizationPercent: 70 });

    let originCertificate: acm.ICertificate | undefined;
    if (hostedZone && domainName) {
      originCertificate = new acm.Certificate(this, "OriginCertificate", {
        domainName: `origin.${domainName}`,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
    }

    // Two AZs, not all six — each public IPv4 the ALB holds bills hourly, and
    // two is the ALB minimum.
    const originAlb = new elbv2.ApplicationLoadBalancer(this, "OriginAlb", {
      vpc: defaultVpc,
      internetFacing: true,
      vpcSubnets: { subnets: originSubnets },
    });

    const originListener = originCertificate
      ? originAlb.addListener("Https", {
          port: 443,
          certificates: [originCertificate],
          open: false,
        })
      : originAlb.addListener("Http", { port: 80, open: false });

    // Only CloudFront's origin-facing range may reach the ALB — the origin
    // subdomain resolves publicly, but direct requests bypassing the CDN (and
    // its cache/rate limiting) are dropped at the security group.
    const cloudfrontOriginFacing = ec2.PrefixList.fromLookup(
      this,
      "CloudFrontOriginFacing",
      { prefixListName: "com.amazonaws.global.cloudfront.origin-facing" }
    );
    originAlb.connections.allowFrom(
      ec2.Peer.prefixList(cloudfrontOriginFacing.prefixListId),
      ec2.Port.tcp(originCertificate ? 443 : 80)
    );

    originListener.addTargets("Web", {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [webService],
      healthCheck: { path: "/", healthyHttpCodes: "200" },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    if (hostedZone) {
      new route53.ARecord(this, "OriginAliasRecord", {
        zone: hostedZone,
        recordName: "origin",
        target: route53.RecordTarget.fromAlias(
          new route53Targets.LoadBalancerTarget(originAlb)
        ),
      });
    }

    const originHost =
      hostedZone && domainName
        ? `origin.${domainName}`
        : originAlb.loadBalancerDnsName;
    const originProtocolPolicy = originCertificate
      ? cloudfront.OriginProtocolPolicy.HTTPS_ONLY
      : cloudfront.OriginProtocolPolicy.HTTP_ONLY;

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
        origin: new origins.HttpOrigin(originHost, {
          protocolPolicy: originProtocolPolicy,
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
          origin: new origins.HttpOrigin(originHost, {
            protocolPolicy: originProtocolPolicy,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        // Static feeds. The default behaviour keys on the preference cookies
        // and RSC headers, which would shard the cache for files that are
        // identical for every viewer.
        "/ical/*": {
          origin: new origins.HttpOrigin(originHost, {
            protocolPolicy: originProtocolPolicy,
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

    new cdk.CfnOutput(this, "OriginAlbUrl", {
      value:
        hostedZone && domainName
          ? `https://origin.${domainName}`
          : `http://${originAlb.loadBalancerDnsName}`,
      description: "Dedicated origin ALB endpoint",
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
