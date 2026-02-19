#!/usr/bin/env tsx

// We need to have a separate deployment script in order to know the CDK
// generated URLs when building the website. Maybe there is a way to build this
// in the CDK, which would be nicer.

import { execSync } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CDK_DIR = path.join(ROOT_DIR, "cdk");

function run(
  command: string,
  options?: { cwd?: string; env?: Partial<NodeJS.ProcessEnv> }
) {
  console.log(`\n$ ${command}\n`);
  execSync(command, {
    stdio: "inherit",
    cwd: options?.cwd ?? ROOT_DIR,
    env: { ...process.env, ...options?.env },
  });
}

function runAndCapture(command: string, options?: { cwd?: string }): string {
  console.log(`\n$ ${command}\n`);
  return execSync(command, {
    cwd: options?.cwd ?? ROOT_DIR,
    encoding: "utf-8",
  }).trim();
}

function getStackOutputs(stackName: string): Record<string, string> {
  const output = runAndCapture(
    `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs" --output json`
  );
  const outputs = JSON.parse(output) as Array<{
    OutputKey: string;
    OutputValue: string;
  }>;
  return Object.fromEntries(outputs.map((o) => [o.OutputKey, o.OutputValue]));
}

async function main() {
  const notificationEmail = process.argv[2];
  if (!notificationEmail) {
    console.error("Usage: tsx scripts/deploy.ts <notification-email>");
    process.exit(1);
  }

  const stage = process.env.STAGE || "dev";
  const domainName = stage === "production" ? "pl-conferences.com" : undefined;
  const stackName = `PlConf-${stage}`;

  console.log("=".repeat(60));
  console.log(`Deploying stage: ${stage}`);
  console.log("=".repeat(60));

  console.log("\nBuilding lambdas...");
  run("pnpm run build:lambdas");

  console.log("\nDeploying CDK infrastructure...");
  const cdkContextArgs = [
    `-c notificationEmail=${notificationEmail}`,
    `-c stage=${stage}`,
    domainName ? `-c domainName=${domainName}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  run(`pnpm exec cdk deploy --require-approval never ${cdkContextArgs}`, {
    cwd: CDK_DIR,
  });

  console.log("\nFetching stack outputs...");
  const outputs = getStackOutputs(stackName);
  console.log("Stack outputs:", outputs);

  const submissionApiUrl = outputs.SubmissionApiUrl;
  const icalApiUrl = outputs.ICalApiUrl;
  const websiteBucketName = outputs.WebsiteBucketName;
  const distributionId = outputs.DistributionId;

  if (
    !submissionApiUrl ||
    !icalApiUrl ||
    !websiteBucketName ||
    !distributionId
  ) {
    console.error("Missing required stack outputs");
    process.exit(1);
  }

  console.log("\nBuilding Next.js with API URLs...");
  run("pnpm run build", {
    env: {
      NEXT_PUBLIC_SUBMISSION_API_URL: submissionApiUrl,
      NEXT_PUBLIC_ICAL_API_URL: icalApiUrl,
    },
  });

  console.log("\nUploading to S3...");
  run(
    `aws s3 sync out/_next/static/ s3://${websiteBucketName}/_next/static --delete --cache-control "public, max-age=31536000, immutable"`
  );
  run(
    `aws s3 sync out/ s3://${websiteBucketName}/ --delete --cache-control "public, max-age=0, must-revalidate" --exclude "_next/static/*"`
  );

  console.log("\nInvalidating CloudFront cache...");
  run(
    `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`
  );

  console.log("\n" + "=".repeat(60));
  console.log("Deployment complete");
  console.log(
    `Website URL: ${domainName ? `https://${domainName}` : outputs.WebsiteUrl}`
  );
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
