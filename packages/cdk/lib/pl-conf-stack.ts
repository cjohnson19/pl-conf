import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
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
    const removalPolicy = isProduction
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

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

    const rateLimitTable = new dynamodb.Table(this, "RateLimitTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
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
        actions: ["ses:SendEmail"],
        resources: ["*"],
      })
    );

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
    cluster.applyRemovalPolicy(removalPolicy);

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
      removalPolicy,
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
        // PORT/HOSTNAME are owned by the Dockerfile: nginx listens on the
        // public 3000 and node binds loopback 3001. Overriding them here
        // makes node fight nginx for 3000 (EADDRINUSE crash loop).
        NODE_ENV: "production",
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
        // Must cover s-maxage + the widest stale window from next.config.ts
        // (60 + stale-if-error=86400): CloudFront clamps the stale windows to
        // maxTtl and drops the object entirely once it passes.
        maxTtl: cdk.Duration.days(2),
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

    const staticOrigin = new origins.HttpOrigin(originHost, {
      protocolPolicy: originProtocolPolicy,
    });

    const staticAssetBehavior: cloudfront.BehaviorOptions = {
      origin: staticOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
    };

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
        "/_next/static/*": staticAssetBehavior,
        // Static feeds. The default behaviour keys on the preference cookies
        // and RSC headers, which would shard the cache for files that are
        // identical for every viewer.
        "/ical/*": staticAssetBehavior,
      },
    });

    // CloudFront standard logging (v2) via CloudWatch vended log delivery.
    // The Cfn resources must live in us-east-1 (this stack's region).
    // No slashes in the log group name: delivery destinations only accept [\w-].
    const accessLogGroup = new logs.LogGroup(this, "AccessLogGroup", {
      logGroupName: `pl-conf-${stage}-cloudfront-access-logs`,
      retention: logs.RetentionDays.TWO_YEARS,
      removalPolicy,
    });

    const accessLogDeliveryPolicy = new logs.ResourcePolicy(
      this,
      "AccessLogDeliveryPolicy",
      {
        policyStatements: [
          new iam.PolicyStatement({
            sid: "AllowCloudFrontAccessLogDelivery",
            principals: [
              new iam.ServicePrincipal("delivery.logs.amazonaws.com"),
            ],
            actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
            resources: [accessLogGroup.logGroupArn],
            conditions: {
              StringEquals: { "aws:SourceAccount": this.account },
              ArnLike: {
                "aws:SourceArn": `arn:aws:logs:${this.region}:${this.account}:delivery-source:*`,
              },
            },
          }),
        ],
      }
    );

    const accessLogDeliverySource = new logs.CfnDeliverySource(
      this,
      "AccessLogDeliverySource",
      {
        name: `pl-conf-${stage}-access-logs`,
        resourceArn: distribution.distributionArn,
        logType: "ACCESS_LOGS",
      }
    );

    const accessLogDeliveryDestination = new logs.CfnDeliveryDestination(
      this,
      "AccessLogDeliveryDestination",
      {
        name: `pl-conf-${stage}-access-logs-cwl`,
        destinationResourceArn: accessLogGroup.logGroupArn,
        outputFormat: "json",
      }
    );

    const accessLogDelivery = new logs.CfnDelivery(this, "AccessLogDelivery", {
      deliverySourceName: accessLogDeliverySource.name,
      deliveryDestinationArn: accessLogDeliveryDestination.attrArn,
      recordFields: [
        "date",
        "time",
        "c-ip",
        "c-country",
        "asn",
        "cs-method",
        "cs-uri-stem",
        "sc-status",
        "cs(Referer)",
        "cs(User-Agent)",
        "x-edge-result-type",
      ],
    });
    accessLogDelivery.addDependency(accessLogDeliverySource);
    accessLogDelivery.node.addDependency(accessLogDeliveryPolicy);

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
  }
}
