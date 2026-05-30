import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const PORT =
  Number(new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").port) ||
  3000;
const ROOT = path.resolve(import.meta.dirname, "..");
const WEB_DIR = path.join(ROOT, "packages", "web");
const NEXT_TEST_DIR = path.join(WEB_DIR, ".next-test");
const BUILD_ID = path.join(NEXT_TEST_DIR, "BUILD_ID");
const GENERATED_FILE = path.join(
  ROOT,
  "packages",
  "data",
  "generated",
  "events.ts"
);

let serverProcess: ChildProcess | undefined;

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

function waitForPort(port: number, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server did not start within ${timeoutMs}ms`));
        return;
      }
      isPortInUse(port).then((inUse) => {
        if (inUse) resolve();
        else setTimeout(check, 200);
      });
    };
    check();
  });
}

const FIXTURE_SOURCE = path.join(ROOT, "tests", "fixtures", "events.ts");
const GENERATED_BACKUP = `${GENERATED_FILE}.real-backup`;

function buildFixtureSite() {
  if (!fs.existsSync(GENERATED_FILE)) {
    console.log("Running generate-events to satisfy TS path alias...");
    const gen = spawnSync("pnpm", ["run", "generate"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (gen.status !== 0) throw new Error("pnpm run generate failed");
  }

  fs.rmSync(NEXT_TEST_DIR, { recursive: true, force: true });

  // Swap the data package's generated file for the fixture so the build
  // sees the mock events through the same import path as production.
  fs.copyFileSync(GENERATED_FILE, GENERATED_BACKUP);
  fs.copyFileSync(FIXTURE_SOURCE, GENERATED_FILE);

  console.log("Building fixture site (PL_CONF_TEST_FIXTURE=1)...");
  let build: ReturnType<typeof spawnSync> | undefined;
  try {
    // Run web's full build (prebuild generates ical files from the swapped
    // fixture events, then next build emits the .next-test distDir that
    // `next start` serves below).
    build = spawnSync("pnpm", ["--filter", "@pl-conf/web", "run", "build"], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, PL_CONF_TEST_FIXTURE: "1" },
    });
  } finally {
    fs.renameSync(GENERATED_BACKUP, GENERATED_FILE);
  }

  if (!build || build.status !== 0) {
    throw new Error("Fixture build failed");
  }
}

export async function setup() {
  if (await isPortInUse(PORT)) {
    console.log(`Port ${PORT} already in use — skipping server start`);
    return;
  }

  if (process.env.SKIP_TEST_BUILD !== "1") {
    buildFixtureSite();
  }

  if (!fs.existsSync(BUILD_ID)) {
    throw new Error(
      `Fixture build missing at ${NEXT_TEST_DIR}. Unset SKIP_TEST_BUILD to rebuild.`
    );
  }

  // `next start` reads distDir from next.config.ts; PL_CONF_TEST_FIXTURE=1
  // points it at .next-test, matching the build above.
  console.log(`Starting Next server on port ${PORT}`);
  serverProcess = spawn(
    "pnpm",
    [
      "exec",
      "next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(PORT),
    ],
    {
      cwd: WEB_DIR,
      stdio: "pipe",
      env: {
        ...process.env,
        PL_CONF_TEST_FIXTURE: "1",
        NODE_ENV: "production",
      },
    }
  );

  serverProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString();
    if (!msg.includes("ExperimentalWarning")) process.stderr.write(msg);
  });

  await waitForPort(PORT);
  console.log(`Server ready on port ${PORT}`);
}

export async function teardown() {
  if (serverProcess) {
    console.log("Stopping server");
    serverProcess.kill("SIGTERM");
  }
}
