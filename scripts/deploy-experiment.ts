#!/usr/bin/env tsx

// Deploys the SSR experiment stack (PlConf-experiment).
//
// CDK's DockerImageAsset handles the Docker build + ECR push automatically.
// We just need to ensure the generated events file exists locally, since the
// in-Docker generate would fail (no .git in build context).
//
// Usage:
//   tsx scripts/deploy-experiment.ts
//
// Optional env: STAGE (default "experiment"), SUBMISSION_API_URL (passed
// through to the container so the submission form points at an existing API).

import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CDK_DIR = path.join(ROOT_DIR, "packages", "cdk");

function run(command: string, options?: { cwd?: string }) {
  console.log(`\n$ ${command}\n`);
  execSync(command, {
    stdio: "inherit",
    cwd: options?.cwd ?? ROOT_DIR,
  });
}

function getStackOutputs(stackName: string): Record<string, string> {
  try {
    const output = execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs" --output json`,
      { encoding: "utf-8" }
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
  const stage = process.env.STAGE || "experiment";
  const stackName = `PlConf-${stage}`;
  const submissionApiUrl = process.env.SUBMISSION_API_URL;

  console.log("=".repeat(60));
  console.log(`Deploying experiment stack: ${stackName}`);
  console.log("=".repeat(60));

  console.log("\nGenerating events data...");
  run("pnpm run generate");

  console.log("\nDeploying CDK (DockerImageAsset will build & push image)...");
  const ctxArgs = [
    `-c stage=${stage}`,
    submissionApiUrl ? `-c submissionApiUrl=${submissionApiUrl}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  run(`pnpm exec cdk deploy --require-approval never ${ctxArgs}`, {
    cwd: CDK_DIR,
  });

  const outputs = getStackOutputs(stackName);
  console.log(`\n${"=".repeat(60)}`);
  console.log("Experiment deployed");
  console.log(`CloudFront URL:    ${outputs.DistributionUrl ?? "(unknown)"}`);
  console.log(`Origin endpoint:   ${outputs.ServiceEndpoint ?? "(unknown)"}`);
  console.log(`Distribution ID:   ${outputs.DistributionId ?? "(unknown)"}`);
  console.log("=".repeat(60));
  console.log("\nTear down with:");
  console.log(
    `  (cd packages/cdk && pnpm exec cdk destroy -c stage=${stage} --force)`
  );
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
