#!/usr/bin/env tsx

// Destroys the PlConf-dev stack and cleans up the Docker image(s) it pushed
// to the CDK bootstrap ECR asset repo. CDK doesn't track asset lifetime — the
// images are tagged by content hash and shared across stacks, so we capture
// the tags this stack referenced *before* destroying, then delete them after.

import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CDK_DIR = path.join(ROOT_DIR, "packages", "cdk");
const STACK_NAME = "PlConf-dev";

function run(command: string, options?: { cwd?: string }) {
  console.log(`\n$ ${command}\n`);
  execSync(command, { stdio: "inherit", cwd: options?.cwd ?? ROOT_DIR });
}

function tryExec(command: string): string | undefined {
  try {
    return execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return undefined;
  }
}

interface AssetImage {
  repository: string;
  tag: string;
}

function getAssetImages(stackName: string): AssetImage[] {
  const template = tryExec(
    `aws cloudformation get-template --stack-name ${stackName} --query TemplateBody --output json`
  );
  if (!template) return [];

  // CDK asset URIs look like:
  //   <account>.dkr.ecr.<region>.amazonaws.com/cdk-hnb659fds-container-assets-<account>-<region>:<hash>
  const pattern =
    /(\d+\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/cdk-[a-z0-9-]+-container-assets-\d+-[a-z0-9-]+):([a-f0-9]+)/g;

  const seen = new Set<string>();
  const images: AssetImage[] = [];
  for (const match of template.matchAll(pattern)) {
    const uri = match[0];
    if (seen.has(uri)) continue;
    seen.add(uri);
    const repository = match[1].split("/").slice(1).join("/");
    images.push({ repository, tag: match[2] });
  }
  return images;
}

function deleteEcrImage({ repository, tag }: AssetImage) {
  const result = tryExec(
    `aws ecr batch-delete-image --repository-name ${repository} --image-ids imageTag=${tag} --output json`
  );
  if (result) {
    console.log(`Deleted ${repository}:${tag}`);
  } else {
    console.warn(`Could not delete ${repository}:${tag} (already gone?)`);
  }
}

function main() {
  console.log(`Capturing asset image refs from ${STACK_NAME}...`);
  const images = getAssetImages(STACK_NAME);
  if (images.length === 0) {
    console.log("No CDK asset images found in the stack template.");
  } else {
    for (const image of images) {
      console.log(`  ${image.repository}:${image.tag}`);
    }
  }

  run(
    `pnpm exec cdk destroy --force -c stage=dev -c notificationEmail=unused ${STACK_NAME}`,
    { cwd: CDK_DIR }
  );

  if (images.length > 0) {
    console.log("\nCleaning up ECR asset images...");
    images.forEach(deleteEcrImage);
  }

  console.log("\nDone.");
}

main();
