// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import { ScheduledEvent } from "@/lib/event";
import { format } from "date-fns";
import { exec } from "node:child_process";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as YAML from "yaml";

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
        .join("\n"),
    );
  } else {
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
            fromYamlFile(join(dataPath, yearDir, fileName)),
          ),
        );
        return res;
      }),
    );
    const events = Object.fromEntries(
      conferences.flat().map((c) => [c.abbreviation, c]),
    );

    const eventLink = new sst.Linkable("EventList", {
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
      link: [eventLink, webpageBucket, driftEmail],
    });

    new sst.aws.Cron("DriftCronJob", {
      function: driftFunction.arn,
      schedule: "cron(0 17 * * ? *)",
    });

    new sst.aws.Nextjs("PLConf", {
      link: [eventLink],
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
