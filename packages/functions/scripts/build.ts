import * as esbuild from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(__dirname, "..");
const OUT_DIR = join(PKG_DIR, "dist");

async function build() {
  await mkdir(OUT_DIR, { recursive: true });

  await esbuild.build({
    entryPoints: [join(PKG_DIR, "drift/index.ts")],
    bundle: true,
    platform: "node",
    target: "node22",
    outfile: join(OUT_DIR, "drift/index.js"),
    format: "cjs",
    sourcemap: true,
    external: ["@aws-sdk/client-s3", "@aws-sdk/client-sesv2"],
  });
  console.log("Built drift lambda");

  console.log("Lambda build complete!");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
