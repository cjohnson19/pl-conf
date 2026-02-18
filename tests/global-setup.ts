import { type ChildProcess, spawn } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";

const PORT =
  Number(new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").port) ||
  3000;
const ROOT = path.resolve(import.meta.dirname, "..");

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

export async function setup() {
  if (await isPortInUse(PORT)) {
    console.log(`Port ${PORT} already in use — skipping server start`);
    return;
  }

  const outDir = path.join(ROOT, "out");
  const hasStaticBuild = fs.existsSync(path.join(outDir, "index.html"));

  if (hasStaticBuild) {
    console.log(`Serving static build from out/ on port ${PORT}`);
    serverProcess = spawn(
      "npx",
      ["serve", "out", "-l", String(PORT), "--no-clipboard"],
      {
        cwd: ROOT,
        stdio: "pipe",
      }
    );
  } else {
    console.log(`No static build found — starting next dev on port ${PORT}`);
    serverProcess = spawn("pnpm", ["run", "dev"], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, PORT: String(PORT) },
    });
  }

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
