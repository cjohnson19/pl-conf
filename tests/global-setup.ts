import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { assembleStandalone } from "../scripts/lib/standalone";
import { E2E_BASE_URL } from "./e2e-url";
import { FROZEN_NOW_MS } from "./frozen-now";

const ROOT = path.resolve(import.meta.dirname, "..");
const WEB_DIR = path.join(ROOT, "packages", "web");
const NEXT_TEST_DIR = path.join(WEB_DIR, ".next-test");
const SERVER_ENTRY = path.join(
  NEXT_TEST_DIR,
  "standalone",
  "packages",
  "web",
  "server.js"
);
const GENERATED_FILE = path.join(
  ROOT,
  "packages",
  "data",
  "generated",
  "events.ts"
);
const FIXTURE_SOURCE = path.join(ROOT, "tests", "fixtures", "events.ts");
const GENERATED_BACKUP = `${GENERATED_FILE}.real-backup`;

let serverProcess: ChildProcess | undefined;

const pnpm = (args: string[], env: Record<string, string> = {}) =>
  spawnSync("pnpm", args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  }).status === 0;

function buildFixtureSite() {
  if (!fs.existsSync(GENERATED_FILE) && !pnpm(["run", "generate"])) {
    throw new Error("pnpm run generate failed");
  }

  fs.rmSync(NEXT_TEST_DIR, { recursive: true, force: true });

  // Swap the data package's generated file for the fixture so the build
  // sees the mock events through the same import path as production.
  fs.copyFileSync(GENERATED_FILE, GENERATED_BACKUP);
  fs.copyFileSync(FIXTURE_SOURCE, GENERATED_FILE);
  console.log("Building fixture site (PL_CONF_TEST_FIXTURE=1)...");
  let built = false;
  try {
    built = pnpm(["--filter", "@pl-conf/web", "run", "build"], {
      PL_CONF_TEST_FIXTURE: "1",
      PL_CONF_NOW_MS: String(FROZEN_NOW_MS),
    });
  } finally {
    fs.renameSync(GENERATED_BACKUP, GENERATED_FILE);
  }
  if (!built) throw new Error("Fixture build failed");

  assembleStandalone(WEB_DIR, ".next-test");

  // The fixture build's prebuild step refilled public/ical with MOCK feeds.
  // They are inside the standalone bundle now, so rebuild the real ones.
  console.log("Restoring real iCal feeds...");
  if (!pnpm(["--filter", "@pl-conf/web", "run", "prebuild"])) {
    console.warn("Could not restore real iCal feeds; run `pnpm run generate`.");
  }
}

async function waitForServer(url: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

export async function setup() {
  if (process.env.E2E_BASE_URL) {
    console.log(`E2E_BASE_URL set — testing against ${E2E_BASE_URL}`);
    return;
  }

  if (process.env.SKIP_TEST_BUILD !== "1") buildFixtureSite();

  if (!fs.existsSync(SERVER_ENTRY)) {
    throw new Error(
      `Standalone server bundle missing at ${SERVER_ENTRY}. Unset SKIP_TEST_BUILD to rebuild.`
    );
  }

  const port = new URL(E2E_BASE_URL).port;
  console.log(`Starting fixture server on ${E2E_BASE_URL}`);
  serverProcess = spawn("node", [SERVER_ENTRY], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      PL_CONF_NOW_MS: String(FROZEN_NOW_MS),
    },
  });
  await waitForServer(E2E_BASE_URL);
}

export async function teardown() {
  const child = serverProcess;
  if (!child) return;
  child.kill("SIGTERM");
  if (child.exitCode !== null || child.signalCode !== null) return;
  // Wait for the port to actually free up so the next run's setup doesn't
  // find it still held; give up after a short timeout rather than hang.
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
