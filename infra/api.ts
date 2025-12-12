import { submissionsBucket, rateLimitTable } from "./storage";

export const notificationEmailSecret = new sst.Secret("NotificationEmail");

export const submissionEmail = new sst.aws.Email("SubmissionEmail", {
  sender: `drift-${$app.stage}@pl-conferences.com`,
});

export const submissionFunction = new sst.aws.Function("SubmissionFunction", {
  handler: "packages/functions/submission/index.handler",
  link: [
    submissionsBucket,
    submissionEmail,
    notificationEmailSecret,
    rateLimitTable,
  ],
  nodejs: {
    install: [
      "zod",
      "yaml",
      "@aws-sdk/client-s3",
      "@aws-sdk/client-sesv2",
      "@aws-sdk/client-dynamodb",
    ],
  },
  timeout: "30 seconds",
});

export const submissionApi = new sst.aws.ApiGatewayV2("SubmissionApi", {
  cors: {
    allowOrigins:
      $app.stage === "production"
        ? ["https://pl-conferences.com", "https://www.pl-conferences.com"]
        : ["*"],
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    allowCredentials: false,
  },
  transform: {
    stage: {
      defaultRouteSettings: {
        throttlingBurstLimit: 20,
        throttlingRateLimit: 10,
      },
    },
  },
});

submissionApi.route("POST /", submissionFunction.arn);

new aws.cloudwatch.MetricAlarm("HighLambdaErrors", {
  alarmDescription: "High number of Lambda errors",
  metricName: "Errors",
  namespace: "AWS/Lambda",
  statistic: "Sum",
  dimensions: {
    FunctionName: submissionFunction.name,
  },
  period: 300, // 5 minutes
  evaluationPeriods: 1,
  threshold: 5,
  comparisonOperator: "GreaterThanThreshold",
  treatMissingData: "notBreaching",
});
