import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { DockerImageAsset, Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PlConfExperimentStackProps extends cdk.StackProps {
  submissionApiUrl?: string;
}

export class PlConfExperimentStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: PlConfExperimentStackProps = {}
  ) {
    super(scope, id, props);

    const cluster = new ecs.CfnCluster(this, "ExperimentCluster", {
      capacityProviders: ["FARGATE"],
    });
    cluster.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const executionRole = new iam.Role(this, "ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    const infrastructureRole = new iam.Role(this, "InfrastructureRole", {
      assumedBy: new iam.ServicePrincipal("ecs.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSInfrastructureRoleforExpressGatewayServices"
        ),
      ],
    });

    const logGroup = new logs.LogGroup(this, "ServiceLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const image = new DockerImageAsset(this, "WebImage", {
      directory: path.join(__dirname, "../../.."),
      file: "Dockerfile",
      platform: Platform.LINUX_AMD64,
    });

    const service = new ecs.CfnExpressGatewayService(this, "WebService", {
      cluster: cluster.attrArn,
      executionRoleArn: executionRole.roleArn,
      infrastructureRoleArn: infrastructureRole.roleArn,
      cpu: "1024",
      memory: "2048",
      healthCheckPath: "/",
      primaryContainer: {
        image: image.imageUri,
        containerPort: 3000,
        environment: [
          { name: "NODE_ENV", value: "production" },
          { name: "PORT", value: "3000" },
          { name: "HOSTNAME", value: "0.0.0.0" },
          ...(props.submissionApiUrl
            ? [
                {
                  name: "NEXT_PUBLIC_SUBMISSION_API_URL",
                  value: props.submissionApiUrl,
                },
              ]
            : []),
        ],
        awsLogsConfiguration: {
          logGroup: logGroup.logGroupName,
          logStreamPrefix: "web",
        },
      },
      scalingTarget: {
        minTaskCount: 1,
        maxTaskCount: 2,
      },
    });
    service.node.addDependency(cluster, executionRole, infrastructureRole);

    const filterQueryParams = ["q", "c", "view", "tags"];

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
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      }
    );

    const htmlOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      "HtmlOriginRequestPolicy",
      {
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
        queryStringBehavior:
          cloudfront.OriginRequestQueryStringBehavior.allowList(
            ...filterQueryParams
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
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: htmlCachePolicy,
        originRequestPolicy: htmlOriginRequestPolicy,
        compress: true,
      },
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

    new cdk.CfnOutput(this, "ServiceEndpoint", {
      value: `https://${service.attrEndpoint}`,
      description: "ECS Express service endpoint (origin)",
    });

    new cdk.CfnOutput(this, "DistributionUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront distribution URL (use this in the browser)",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID (for cache invalidation)",
    });
  }
}
