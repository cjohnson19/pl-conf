#!/usr/bin/env tsx

// Deploys the PlConf-<stage> stack — drift detection only (S3 + Lambda + a
// daily cron). The web tier and submission API run on Vercel, so nothing here
// serves user traffic and the deploy is a single CDK pass.

import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CDK_DIR = path.join(ROOT_DIR, "packages", "cdk");

function run(command: string, options?: { cwd?: string }) {
  console.log(`\n$ ${command}\n`);
  execSync(command, { stdio: "inherit", cwd: options?.cwd ?? ROOT_DIR });
}

function getStackOutputs(stackName: string): Record<string, string> {
  try {
    const output = execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs" --output json`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    const outputs = JSON.parse(output) as Array<{
      OutputKey: string;
      OutputValue: string;
    }>;
    return Object.fromEntries(outputs.map((o) => [o.OutputKey, o.OutputValue]));
  } catch {
    return {};
  }
}

async function main() {
  const notificationEmail = process.argv[2];
  if (!notificationEmail) {
    console.error("Usage: tsx scripts/deploy.ts <notification-email>");
    process.exit(1);
  }

  const stage = process.env.STAGE || "dev";
  const stackName = `PlConf-${stage}`;

  console.log("=".repeat(60));
  console.log(`Deploying stage: ${stage}`);
  console.log("=".repeat(60));

  console.log("\nGenerating events data...");
  run("pnpm run generate");

  console.log("\nBuilding lambdas...");
  run("pnpm run build:lambdas");

  run(
    `pnpm exec cdk deploy --require-approval never -c notificationEmail=${notificationEmail} -c stage=${stage}`,
    { cwd: CDK_DIR }
  );

  const outputs = getStackOutputs(stackName);

  console.log(`\n${"=".repeat(60)}`);
  console.log("Deployment complete");
  console.log(
    `Drift snapshots bucket: ${outputs.DriftSnapshotsBucketName ?? "(unknown)"}`
  );
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
