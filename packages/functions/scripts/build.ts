import * as esbuild from "esbuild";
import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(__dirname, "..");
const OUT_DIR = join(PKG_DIR, "dist");

const lambdas = [
  {
    name: "submission",
    external: ["@aws-sdk/client-sesv2", "@aws-sdk/client-dynamodb"],
  },
];

async function build() {
  await rm(OUT_DIR, { recursive: true, force: true });

  for (const { name, external } of lambdas) {
    await esbuild.build({
      entryPoints: [join(PKG_DIR, `${name}/index.ts`)],
      bundle: true,
      platform: "node",
      target: "node22",
      outfile: join(OUT_DIR, `${name}/index.js`),
      format: "cjs",
      sourcemap: true,
      external,
    });
    console.log(`Built ${name} lambda`);
  }

  console.log("Lambda build complete!");
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
