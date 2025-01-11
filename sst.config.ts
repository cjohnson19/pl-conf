// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import { fromYaml, ScheduledEvent } from "@/lib/event";
import { readFile } from "node:fs/promises";

export default $config({
  app(input) {
    return {
      name: "pl-conf",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const res = await readFile(process.cwd() + "/data/conf.yaml", "utf8");
    const es = fromYaml(res);
    const events = Object.fromEntries(
      es.map((e: ScheduledEvent) => [e.abbreviation, e]),
    );

    const eventList = new sst.Linkable("EventList", {
      properties: { events },
    });

    const webpageBucket = new sst.aws.Bucket("WebpageBucket", {
      versioning: true,
    });

    const driftEmail = new sst.aws.Email("DriftEmail", {
      sender: `drift-${$app.stage}@pl-conferences.com`,
    });

    const driftFunction = new sst.aws.Function("DriftFunction", {
      handler: "drift-lambda/index.handler",
      link: [eventList, webpageBucket, driftEmail],
    });

    new sst.aws.Cron("DriftCronJob", {
      function: driftFunction.arn,
      schedule: "rate(1 day)",
    });

    new sst.aws.Nextjs("PLConf", {
      link: [eventList],
      domain:
        $app.stage === "production"
          ? {
              name: "pl-conferences.com",
              redirects: ["www.pl-conferences.com"],
            }
          : undefined,
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
