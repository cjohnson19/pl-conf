import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Has Chrome compile each chunk off the main thread as it downloads.
// https://v8.dev/blog/explicit-compile-hints
const COMPILE_HINT = "//# allFunctionsCalledOnLoad\n";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Same choice as `distDir` in next.config.ts.
const DIST_DIR =
  process.env.PL_CONF_TEST_FIXTURE === "1" ? ".next-test" : ".next";
const CHUNKS_DIR = join(__dirname, "..", DIST_DIR, "static", "chunks");

async function main() {
  const chunks = (await readdir(CHUNKS_DIR)).filter((f) => f.endsWith(".js"));
  await Promise.all(
    chunks.map(async (name) => {
      const file = join(CHUNKS_DIR, name);
      await writeFile(file, COMPILE_HINT + (await readFile(file, "utf8")));
    })
  );
  console.log(`Added compile hints to ${chunks.length} chunks`);
}

main().catch((err) => {
  console.error("Failed to add compile hints:", err);
  process.exit(1);
});
