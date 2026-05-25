#!/usr/bin/env tsx

// Deploys the PlConf-<stage> stack.
//
// The site runs SSR on ECS Express; CDK's DockerImageAsset builds and pushes
// the container image during `cdk deploy`. The submission API URL must be
// inlined into the image at build time (NEXT_PUBLIC_* are baked in by Next),
// but the URL is also an output of this same stack — so on the very first
// deploy we bootstrap with two CDK passes: pass 1 creates the API and gets
// its URL, pass 2 rebuilds the image with the URL baked in.
//
// On subsequent deploys the URL is already known (read from existing stack
// outputs) and we deploy in a single pass.

import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CDK_DIR = path.join(ROOT_DIR, "packages", "cdk");

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

function cdkDeploy(args: {
  stage: string;
  notificationEmail: string;
  domainName?: string;
  submissionApiUrl?: string;
}) {
  const ctxArgs = [
    `-c notificationEmail=${args.notificationEmail}`,
    `-c stage=${args.stage}`,
    args.domainName ? `-c domainName=${args.domainName}` : "",
    args.submissionApiUrl ? `-c submissionApiUrl=${args.submissionApiUrl}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  run(`pnpm exec cdk deploy --require-approval never ${ctxArgs}`, {
    cwd: CDK_DIR,
  });
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

  console.log("\nGenerating events data...");
  run("pnpm run generate");

  console.log("\nBuilding lambdas...");
  run("pnpm run build:lambdas");

  let submissionApiUrl = getStackOutputs(stackName).SubmissionApiUrl;

  if (!submissionApiUrl) {
    console.log(
      "\nNo existing SubmissionApiUrl found — running bootstrap deploy to create the API..."
    );
    cdkDeploy({ stage, notificationEmail, domainName });
    submissionApiUrl = getStackOutputs(stackName).SubmissionApiUrl;
    if (!submissionApiUrl) {
      console.error(
        "Bootstrap deploy completed but SubmissionApiUrl is still missing from stack outputs."
      );
      process.exit(1);
    }
    console.log(`\nBootstrapped SubmissionApiUrl: ${submissionApiUrl}`);
  }

  console.log(
    `\nDeploying with SubmissionApiUrl=${submissionApiUrl} (DockerImageAsset will rebuild only if the arg changed)...`
  );
  cdkDeploy({ stage, notificationEmail, domainName, submissionApiUrl });

  const outputs = getStackOutputs(stackName);
  const distributionId = outputs.DistributionId;

  if (distributionId) {
    console.log("\nInvalidating CloudFront cache...");
    run(
      `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`
    );
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Deployment complete");
  console.log(
    `Website URL:    ${domainName ? `https://${domainName}` : outputs.WebsiteUrl}`
  );
  console.log(`Origin:         ${outputs.ServiceEndpoint ?? "(unknown)"}`);
  console.log(`Distribution:   ${distributionId ?? "(unknown)"}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
