// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import { ScheduledEvent } from "./packages/core/src/event.js";
import { format } from "date-fns";
import { exec } from "node:child_process";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as YAML from "yaml";

function duplicates(values: {
  [k: string]: string;
}): { date: string; names: string[] }[] {
  const seen = new Map<string, string[]>();
  for (const [dateName, date] of Object.entries(values)) {
    const curr = seen.get(date);
    if (curr !== undefined) {
      seen.set(date, [...curr, dateName]);
    } else {
      seen.set(date, [dateName]);
    }
  }
  return [...seen.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([k, v]) => ({
      date: k,
      names: v,
    }));
}

async function lastUpdatedDate(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`git log -1 --pretty="format:%cs" ${fileName}`, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        if (stdout === "") {
          console.warn(`No git history for ${fileName}, using current date`);
          resolve(format(new Date(), "yyyy-MM-dd"));
        } else {
          resolve(stdout);
        }
      }
    });
  });
}

async function fromYamlFile(fileName: string): Promise<ScheduledEvent> {
  const yaml = await readFile(fileName, "utf8");
  const lastUpdated = await lastUpdatedDate(fileName);
  const data = YAML.parse(yaml);
  const parseRes = ScheduledEvent.safeParse({
    ...data,
    lastUpdated,
  });
  if (parseRes.success === false) {
    throw new Error(
      parseRes.error.errors
        .map((e) => `${fileName} ${e.path}: ${e.message}`)
        .join("\n")
    );
  } else {
    const dupes = duplicates(parseRes.data.importantDates);
    if (dupes.length > 0) {
      const duplicateListings = dupes
        .map(({ date: value, names }) => `${value}: ${names.join(", ")}`)
        .join("\n");
      console.warn(
        `Found duplicated values for the important dates in ${parseRes.data.abbreviation}.\n${duplicateListings}\nDouble check these are not a copy paste mistake.`
      );
    }
    return parseRes.data;
  }
}

export default $config({
  app(input) {
    return {
      name: "pl-conf",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const dataPath = join(process.cwd(), "data");
    const conferenceYears = (await readdir(dataPath)).map(async (entry) => {
      const stats = await lstat(join(dataPath, entry));
      return stats.isDirectory() ? [entry] : [];
    });
    const conferences: ScheduledEvent[][] = await Promise.all(
      (await Promise.all(conferenceYears)).flat().map(async (yearDir) => {
        const conferenceFiles = await readdir(join(dataPath, yearDir));
        const res = await Promise.all(
          conferenceFiles.map(async (fileName) =>
            fromYamlFile(join(dataPath, yearDir, fileName))
          )
        );
        return res;
      })
    );
    const events = Object.fromEntries(
      conferences.flat().map((c) => [c.abbreviation, c])
    );

    const eventLink = new sst.Linkable("EventList", {
      properties: { events },
    });

    const webpageBucket = new sst.aws.Bucket("WebpageBucket", {
      versioning: true,
    });

    const submissionsBucket = new sst.aws.Bucket("SubmissionsBucket", {
      versioning: true,
    });

    // Secret for notification email address
    const notificationEmailSecret = new sst.Secret("NotificationEmail");

    // Submission notification email
    const submissionEmail = new sst.aws.Email("SubmissionEmail", {
      sender: `drift-${$app.stage}@pl-conferences.com`,
    });

    // Rate limiting table
    const rateLimitTable = new sst.aws.Dynamo("RateLimitTable", {
      fields: {
        id: "string",
      },
      primaryIndex: { hashKey: "id" },
      ttl: "ttl",
    });

    // Event submission Lambda and API
    const submissionFunction = new sst.aws.Function("SubmissionFunction", {
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

    const submissionApi = new sst.aws.ApiGatewayV2("SubmissionApi", {
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

    // CloudWatch alarms for security monitoring
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

    // Only deploy drift detection resources in production
    if ($app.stage === "production") {
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

    new sst.aws.Nextjs("PLConf", {
      link: [eventLink, submissionApi],
      domain:
        $app.stage === "production"
          ? {
              name: "pl-conferences.com",
              redirects: ["www.pl-conferences.com"],
            }
          : undefined,
      environment: {
        NODE_ENV: "production",
      },
    });
  },
  console: {
    autodeploy: {
      target(event) {
        // Use the `main` branch as the trigger for production deployment.
        if (
          event.type === "branch" &&
          event.branch === "main" &&
          event.action === "pushed"
        ) {
          return {
            stage: "production",
          };
        }
        if (event.type === "pull_request") {
          return {
            stage: `pr-${event.number}`,
          };
        }
      },
    },
  },
});
