import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const WEB = path.join(ROOT, "packages", "web");
const NEXT_DIR = path.join(WEB, ".next");
const STANDALONE_WEB = path.join(NEXT_DIR, "standalone", "packages", "web");
const SERVER_ENTRY = path.join(STANDALONE_WEB, "server.js");

if (process.env.SKIP_BUILD !== "1") {
  const build = spawnSync("pnpm", ["run", "build"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

if (!fs.existsSync(SERVER_ENTRY)) {
  console.error(`Standalone bundle missing at ${SERVER_ENTRY}.`);
  process.exit(1);
}

// next build's standalone output ships server.js without the static/public
// assets — copy them next to the server so /_next/static/* and /public files
// resolve. Mirrors the layout the ECS image deploys.
fs.rmSync(path.join(STANDALONE_WEB, ".next", "static"), {
  recursive: true,
  force: true,
});
fs.rmSync(path.join(STANDALONE_WEB, "public"), {
  recursive: true,
  force: true,
});
fs.cpSync(
  path.join(NEXT_DIR, "static"),
  path.join(STANDALONE_WEB, ".next", "static"),
  { recursive: true }
);
fs.cpSync(path.join(WEB, "public"), path.join(STANDALONE_WEB, "public"), {
  recursive: true,
});

const port = process.env.PORT ?? "3000";
const hostname = process.env.HOSTNAME ?? "127.0.0.1";
console.log(`Starting standalone server on http://${hostname}:${port}`);

const child = spawn("node", [SERVER_ENTRY], {
  cwd: ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
    NODE_ENV: "production",
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
