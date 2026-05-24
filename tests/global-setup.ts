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
const STANDALONE_WEB_DIR = path.join(
  NEXT_TEST_DIR,
  "standalone",
  "packages",
  "web"
);
const SERVER_ENTRY = path.join(STANDALONE_WEB_DIR, "server.js");
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
    // fixture events, then next build emits the standalone server bundle
    // into .next-test/standalone/).
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

  // The standalone bundle ships server.js + a minimal .next/, but Next
  // expects us to copy static assets and public/ next to the server.
  fs.cpSync(
    path.join(NEXT_TEST_DIR, "static"),
    path.join(STANDALONE_WEB_DIR, ".next", "static"),
    { recursive: true }
  );
  fs.cpSync(
    path.join(WEB_DIR, "public"),
    path.join(STANDALONE_WEB_DIR, "public"),
    { recursive: true }
  );
}

export async function setup() {
  if (await isPortInUse(PORT)) {
    console.log(`Port ${PORT} already in use — skipping server start`);
    return;
  }

  if (process.env.SKIP_TEST_BUILD !== "1") {
    buildFixtureSite();
  }

  if (!fs.existsSync(SERVER_ENTRY)) {
    throw new Error(
      `Standalone server bundle missing at ${SERVER_ENTRY}. Unset SKIP_TEST_BUILD to rebuild.`
    );
  }

  console.log(`Starting standalone Next server on port ${PORT}`);
  serverProcess = spawn("node", [SERVER_ENTRY], {
    cwd: ROOT,
    stdio: "pipe",
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
  });

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
