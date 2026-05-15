import { eventKey } from "@pl-conf/core";
import { ScheduledEvent } from "@pl-conf/core/schemas";
import { format, getYear } from "date-fns";
import { exec } from "node:child_process";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as YAML from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(__dirname, "..");
const DATA_DIR = join(PKG_DIR, "yaml");
const OUTPUT_DIR = join(PKG_DIR, "generated");

function duplicates(values: {
  [k: string]: string;
}): { date: string; names: string[] }[] {
  const seen = new Map<string, string[]>();
  for (const [dateName, date] of Object.entries(values)) {
    const curr = seen.get(date);
    if (curr !== undefined) {
      seen.set(date, [...curr, dateName]);
    } else {
      seen.set(date, [dateName]);
    }
  }
  return [...seen.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([k, v]) => ({
      date: k,
      names: v,
    }));
}

function git(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

async function lastUpdatedDate(fileName: string): Promise<string> {
  const stdout = await git(
    `git log -1 --follow --pretty="format:%cs" -- ${fileName}`
  );
  if (stdout === "") {
    console.warn(`No git history for ${fileName}, using current date`);
    return format(new Date(), "yyyy-MM-dd");
  }
  return stdout;
}

// RFC 5545 SEQUENCE for the iCal feed: calendar clients use it to detect
// updates. Derived from the commit count touching the file (zero-indexed).
// --follow traces history across renames so the count survives directory moves.
async function commitSequence(fileName: string): Promise<number> {
  const stdout = await git(`git log --follow --format=%H -- ${fileName}`);
  const trimmed = stdout.trim();
  const count = trimmed === "" ? 0 : trimmed.split("\n").length;
  return count > 0 ? count - 1 : 0;
}

async function fromYamlFile(fileName: string): Promise<ScheduledEvent> {
  const [yaml, lastUpdated, sequence] = await Promise.all([
    readFile(fileName, "utf8"),
    lastUpdatedDate(fileName),
    commitSequence(fileName),
  ]);
  const data = YAML.parse(yaml);
  const parseRes = ScheduledEvent.safeParse({
    ...data,
    lastUpdated,
    sequence,
  });
  if (parseRes.success === false) {
    throw new Error(
      parseRes.error.errors
        .map((e) => `${fileName} ${e.path}: ${e.message}`)
        .join("\n")
    );
  } else {
    parseRes.data.rounds.forEach((round) => {
      const dupes = duplicates(round.importantDates);
      if (dupes.length > 0) {
        const duplicateListings = dupes
          .map(({ date: value, names }) => `${value}: ${names.join(", ")}`)
          .join("\n");
        const roundLabel = round.name ? ` (${round.name})` : "";
        console.warn(
          `Found duplicated values for the important dates in ${parseRes.data.abbreviation}${roundLabel}.\n${duplicateListings}\nDouble check these are not a copy paste mistake.`
        );
      }
    });
    return parseRes.data;
  }
}

async function loadEvents(): Promise<Record<string, ScheduledEvent>> {
  const conferenceYears = (await readdir(DATA_DIR)).map(async (entry) => {
    const stats = await lstat(join(DATA_DIR, entry));
    return stats.isDirectory() ? [entry] : [];
  });
  const conferences: ScheduledEvent[][] = await Promise.all(
    (await Promise.all(conferenceYears)).flat().map(async (yearDir) => {
      const conferenceFiles = await readdir(join(DATA_DIR, yearDir));
      const res = await Promise.all(
        conferenceFiles.map(async (fileName) =>
          fromYamlFile(join(DATA_DIR, yearDir, fileName))
        )
      );
      return res;
    })
  );
  return Object.fromEntries(conferences.flat().map((c) => [eventKey(c), c]));
}

function validateCrossReferences(events: Record<string, ScheduledEvent>): void {
  const known = new Set(Object.values(events).map((e) => e.abbreviation));
  const errors: string[] = [];
  Object.values(events).forEach((e) => {
    [...e.partOf, ...e.colocatedWith].forEach((ref) => {
      if (!known.has(ref)) {
        errors.push(
          `${e.abbreviation}: references unknown abbreviation "${ref}" in partOf/colocatedWith`
        );
      }
    });
  });
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function validateNoTransitivePartOf(
  events: Record<string, ScheduledEvent>
): void {
  const all = Object.values(events);
  const eventYear = (e: ScheduledEvent) => getYear(new Date(e.date.start));
  const findIn = (abbrev: string, year: number) =>
    all.find((e) => e.abbreviation === abbrev && eventYear(e) === year);

  const ancestors = (abbrev: string, year: number): string[] => {
    const parent = findIn(abbrev, year);
    if (!parent) return [];
    return parent.partOf.flatMap((p) => [p, ...ancestors(p, year)]);
  };

  const errors = all.flatMap((e) => {
    if (e.partOf.length < 2) return [];
    const year = eventYear(e);
    return e.partOf.flatMap((direct) => {
      const via = ancestors(direct, year);
      return e.partOf
        .filter((other) => other !== direct && via.includes(other))
        .map(
          (other) =>
            `${e.abbreviation}: partOf "${other}" is transitive through "${direct}" — remove it`
        );
    });
  });

  if (errors.length > 0) throw new Error(errors.join("\n"));
}

async function main() {
  console.log("Loading events from YAML files...");
  const events = await loadEvents();
  const eventCount = Object.keys(events).length;
  console.log(`Loaded ${eventCount} events`);

  validateCrossReferences(events);
  validateNoTransitivePartOf(events);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const tsContent = `// This file is auto-generated by @pl-conf/data scripts/generate.ts
// Do not edit manually

import type { ScheduledEvent } from "@pl-conf/core";

export const events: Record<string, ScheduledEvent> = ${JSON.stringify(events, null, 2)};
`;

  await writeFile(join(OUTPUT_DIR, "events.ts"), tsContent);
  console.log(`Wrote ${OUTPUT_DIR}/events.ts`);

  await writeFile(
    join(OUTPUT_DIR, "events.json"),
    JSON.stringify(events, null, 2)
  );
  console.log(`Wrote ${OUTPUT_DIR}/events.json`);
}

main().catch((err) => {
  console.error("Failed to generate events:", err);
  process.exit(1);
});
