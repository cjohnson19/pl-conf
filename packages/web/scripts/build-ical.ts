import { hasConcreteDates, icalFileName, toICal } from "@pl-conf/core";
import { events } from "@pl-conf/data";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "ical");

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const written = await Promise.all(
    Object.values(events).map(async (e) => {
      if (!hasConcreteDates(e)) return 0;
      await Promise.all(
        [false, true].map((withDeadlines) =>
          writeFile(
            join(OUT_DIR, icalFileName(e, withDeadlines)),
            toICal(e, withDeadlines)
          )
        )
      );
      return 2;
    })
  );

  const count = written.reduce<number>((a, b) => a + b, 0);
  console.log(`Wrote ${count} iCal files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("Failed to build iCal feeds:", err);
  process.exit(1);
});
