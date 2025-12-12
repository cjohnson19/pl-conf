import { webpageBucket } from "./storage";
import { notificationEmailSecret } from "./api";

export function setupDriftDetection(
  eventLink: sst.Linkable<{ events: Record<string, unknown> }>
) {
  // Only deploy drift detection resources in production
  if ($app.stage !== "production") {
    return;
  }

  const driftEmail = new sst.aws.Email("DriftEmail", {
    sender: `drift-${$app.stage}@pl-conferences.com`,
  });

  const driftFunction = new sst.aws.Function("DriftFunction", {
    handler: "packages/functions/drift/index.handler",
    link: [eventLink, webpageBucket, driftEmail, notificationEmailSecret],
    nodejs: {
      install: [
        "htmlparser2",
        "@aws-sdk/client-s3",
        "@aws-sdk/client-sesv2",
        "fast-diff",
      ],
    },
    timeout: "5 minutes",
  });

  new sst.aws.Cron("DriftCronJob", {
    function: driftFunction.arn,
    schedule: "cron(0 17 * * ? *)",
  });
}
