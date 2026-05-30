import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PlConfStackProps extends cdk.StackProps {
  stage: string;
  notificationEmail: string;
}

// Drift detection only. The web tier and submission API run on Vercel; this
// stack just hosts the scheduled job that watches conference sites for changes.
export class PlConfStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PlConfStackProps) {
    super(scope, id, props);

    const { stage, notificationEmail } = props;
    const isProduction = stage === "production";

    const driftSnapshotsBucket = new s3.Bucket(this, "DriftSnapshots", {
      versioned: true,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });

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

    new cdk.CfnOutput(this, "DriftSnapshotsBucketName", {
      value: driftSnapshotsBucket.bucketName,
      description: "S3 bucket for drift snapshots",
    });
  }
}
