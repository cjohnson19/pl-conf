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
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";
import * as path from "path";

interface PlConfStackProps extends cdk.StackProps {
  stage: string;
  notificationEmail: string;
  domainName?: string;
}

export class PlConfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlConfStackProps) {
    super(scope, id, props);

    const { stage, notificationEmail, domainName } = props;
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

    const webpageBucket = new s3.Bucket(this, "WebpageBucket", {
      versioned: true,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });

    const submissionsBucket = new s3.Bucket(this, "SubmissionsBucket", {
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
        path.join(__dirname, "../../packages/functions/dist/submission")
      ),
      timeout: cdk.Duration.seconds(30),
      environment: {
        SUBMISSIONS_BUCKET_NAME: submissionsBucket.bucketName,
        RATE_LIMIT_TABLE_NAME: rateLimitTable.tableName,
        SUBMISSION_EMAIL_SENDER: `submissions-${stage}@pl-conferences.com`,
        NOTIFICATION_EMAIL: notificationEmail,
      },
    });

    submissionsBucket.grantPut(submissionFunction);
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
        path.join(__dirname, "../../packages/functions/dist/drift")
      ),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        WEBPAGE_BUCKET_NAME: webpageBucket.bucketName,
        NOTIFICATION_EMAIL: notificationEmail,
        DRIFT_EMAIL_SENDER: `drift-${stage}@pl-conferences.com`,
      },
    });

    webpageBucket.grantReadWrite(driftFunction);
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

    const icalFunction = new lambda.Function(this, "ICalFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../packages/functions/dist/ical")
      ),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

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

    const icalApi = new apigateway.HttpApi(this, "ICalApi", {
      corsPreflight: {
        allowOrigins: isProduction
          ? ["https://pl-conferences.com", "https://www.pl-conferences.com"]
          : ["*"],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type"],
      },
    });

    icalApi.addRoutes({
      path: "/ical/{slug}",
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        "ICalIntegration",
        icalFunction
      ),
    });

    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });

    const immutableAssetCachePolicy = new cloudfront.CachePolicy(
      this,
      "ImmutableAssetCache",
      {
        defaultTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.days(1),
        maxTtl: cdk.Duration.days(365),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      }
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
      domainNames,
      certificate,
      additionalBehaviors: {
        "/_next/static/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          cachePolicy: immutableAssetCachePolicy,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/404.html",
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Set up the records to pl-conferences.com if we are in production
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

    new cdk.CfnOutput(this, "WebsiteBucketName", {
      value: websiteBucket.bucketName,
      description: "S3 bucket for static website",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID",
    });

    new cdk.CfnOutput(this, "SubmissionApiUrl", {
      value: submissionApi.url!,
      description: "Submission API endpoint",
    });

    new cdk.CfnOutput(this, "ICalApiUrl", {
      value: icalApi.url!,
      description: "iCal API endpoint",
    });

    new cdk.CfnOutput(this, "WebpageBucketName", {
      value: webpageBucket.bucketName,
      description: "S3 bucket for webpage snapshots",
    });

    new cdk.CfnOutput(this, "SubmissionsBucketName", {
      value: submissionsBucket.bucketName,
      description: "S3 bucket for event submissions",
    });
  }
}
