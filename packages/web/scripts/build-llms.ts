import {
  type DateName,
  dateNameToReadable,
  eventKey,
  eventPath,
  type MaybeDate,
  type Round,
  type ScheduledEvent,
} from "@pl-conf/core";
import { events } from "@pl-conf/data";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public");
const BASE = "https://pl-conferences.com";

const DATA_CONVENTIONS =
  "Deadlines are anywhere-on-earth (AoE) unless the official conference site " +
  "says otherwise. When a site lists a deadline as a date range, the end of " +
  'the range is recorded. "TBD" marks a date that is expected but not yet ' +
  "announced.";

function iso(date: MaybeDate): string {
  return date === "TBD" ? "TBD" : date.replaceAll("/", "-");
}

function dateRange(e: ScheduledEvent): string {
  const start = iso(e.date.start);
  const end = iso(e.date.end);
  return start === end ? start : `${start} to ${end}`;
}

function importantDates(r: Round): [DateName, MaybeDate][] {
  return Object.entries(r.importantDates) as [DateName, MaybeDate][];
}

function roundSection(r: Round, index: number, rounds: Round[]): string {
  const label =
    r.name ?? (rounds.length > 1 ? `Round ${index + 1}` : undefined);
  const heading = label ? `Important dates (${label}):` : "Important dates:";
  const lines = importantDates(r).map(
    ([name, date]) => `- ${dateNameToReadable(name)}: ${iso(date)}`
  );
  return [heading, ...lines].join("\n");
}

function eventMarkdown(e: ScheduledEvent): string {
  const facts = [
    `- Type: ${e.type}`,
    `- Dates: ${dateRange(e)}`,
    e.location && `- Location: ${e.location}`,
    e.format && `- Format: ${e.format}`,
    e.tags.length > 0 && `- Tags: ${e.tags.join(", ")}`,
    e.url && `- Website: ${e.url}`,
    e.submissionUrl && `- Submission site: ${e.submissionUrl}`,
    e.importantDateUrl && `- Official dates page: ${e.importantDateUrl}`,
    e.partOf.length > 0 && `- Part of: ${e.partOf.join(", ")}`,
    e.colocatedWith.length > 0 &&
      `- Co-located with: ${e.colocatedWith.join(", ")}`,
    `- Details: ${BASE}${eventPath(e)}`,
    `- Last updated: ${iso(e.lastUpdated)}`,
  ].filter(Boolean);

  const roundSections = e.rounds
    .filter((r) => Object.keys(r.importantDates).length > 0)
    .map((r, i, rounds) => roundSection(r, i, rounds));

  const notes =
    e.notes.length > 0
      ? ["Notes:", ...e.notes.map((n) => `- ${n}`)].join("\n")
      : undefined;

  return [
    `### ${e.abbreviation} ${e.year} — ${e.name}`,
    facts.join("\n"),
    ...roundSections,
    notes,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function startKey(e: ScheduledEvent): string {
  return e.date.start === "TBD" ? "9999/99/99" : e.date.start;
}

const sorted = Object.values(events).sort(
  (a, b) =>
    a.year - b.year ||
    startKey(a).localeCompare(startKey(b)) ||
    a.abbreviation.localeCompare(b.abbreviation)
);

const years = [...new Set(sorted.map((e) => e.year))];

const llmsFull = `${[
  "# PL Conferences — all tracked events",
  DATA_CONVENTIONS,
  ...years.flatMap((year) => [
    `## ${year}`,
    ...sorted.filter((e) => e.year === year).map(eventMarkdown),
  ]),
].join("\n\n")}\n`;

const llmsTxt = `# PL Conferences

> A tracker of conferences, workshops, and symposia in programming languages,
> formal methods, and verification: event dates, locations, and per-round
> submission deadlines and notification dates.

${DATA_CONVENTIONS}

## Data

- [All events (markdown)](${BASE}/llms-full.txt): every tracked event with dates, location, links, and deadlines
- [All events (JSON)](${BASE}/events.json): the same data in machine-readable form
- [Sitemap](${BASE}/sitemap.xml): index of per-event HTML pages

## Pages

- [Event list](${BASE}/): the filterable live site
- [About](${BASE}/about/): background on the site
`;

const jsonEvents = sorted.map((e) => ({
  key: eventKey(e),
  name: e.name,
  abbreviation: e.abbreviation,
  year: e.year,
  type: e.type,
  date: { start: iso(e.date.start), end: iso(e.date.end) },
  location: e.location,
  format: e.format,
  tags: e.tags,
  url: e.url,
  submissionUrl: e.submissionUrl,
  importantDateUrl: e.importantDateUrl,
  rounds: e.rounds.map((r) => ({
    name: r.name,
    importantDates: Object.fromEntries(
      importantDates(r).map(([name, date]) => [name, iso(date)])
    ),
  })),
  notes: e.notes,
  partOf: e.partOf,
  colocatedWith: e.colocatedWith,
  page: `${BASE}${eventPath(e)}`,
  lastUpdated: iso(e.lastUpdated),
}));

async function main() {
  await Promise.all([
    writeFile(join(OUT_DIR, "llms.txt"), llmsTxt),
    writeFile(join(OUT_DIR, "llms-full.txt"), llmsFull),
    writeFile(
      join(OUT_DIR, "events.json"),
      `${JSON.stringify(jsonEvents, null, 2)}\n`
    ),
  ]);
  console.log(
    `Wrote llms.txt, llms-full.txt, events.json (${sorted.length} events) to ${OUT_DIR}`
  );
}

main().catch((err) => {
  console.error("Failed to build llms exports:", err);
  process.exit(1);
});
