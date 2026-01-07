import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build() {
  const outdir = join(__dirname, "dist");

  await mkdir(outdir, { recursive: true });

  await esbuild.build({
    entryPoints: [join(__dirname, "drift/index.ts")],
    bundle: true,
    platform: "node",
    target: "node22",
    outfile: join(outdir, "drift/index.js"),
    format: "cjs",
    sourcemap: true,
    external: ["@aws-sdk/client-s3", "@aws-sdk/client-sesv2"],
  });
  console.log("Built drift lambda");

  await esbuild.build({
    entryPoints: [join(__dirname, "submission/index.ts")],
    bundle: true,
    platform: "node",
    target: "node22",
    outfile: join(outdir, "submission/index.js"),
    format: "cjs",
    sourcemap: true,
    external: [
      "@aws-sdk/client-s3",
      "@aws-sdk/client-sesv2",
      "@aws-sdk/client-dynamodb",
    ],
  });
  console.log("Built submission lambda");

  await esbuild.build({
    entryPoints: [join(__dirname, "ical/index.ts")],
    bundle: true,
    platform: "node",
    target: "node22",
    outfile: join(outdir, "ical/index.js"),
    format: "cjs",
    sourcemap: true,
    external: [],
  });
  console.log("Built iCal lambda");

  console.log("Lambda build complete!");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
