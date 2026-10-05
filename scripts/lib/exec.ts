import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
export const CDK_DIR = path.join(ROOT_DIR, "packages", "cdk");

export function run(
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

export function tryExec(command: string): string | undefined {
  try {
    return execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return undefined;
  }
}
