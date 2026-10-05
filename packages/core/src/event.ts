import type {
  DateName,
  MaybeDate,
  Round,
  ScheduledEvent,
  Tag,
} from "./schemas";

export const eventTypes = ["conference", "workshop", "symposium"] as const;

export const tagValues = [
  "types",
  "semantics",
  "verification",
  "model-checking",
  "theorem-proving",
  "logic",
  "automata",
  "concurrency",
  "compilers",
  "program-analysis",
  "program-synthesis",
  "formal-methods",
  "software-engineering",
  "category-theory",
  "proof-assistants",
  "functional-programming",
  "logic-programming",
  "quantum",
  "probabilistic",
  "security",
  "systems",
] as const;

export type {
  MaybeDate,
  DateName,
  EventType,
  Round,
  ScheduledEvent,
  Tag,
} from "./schemas";

const tagDisplayNames: Record<Tag, string> = {
  types: "Types",
  semantics: "Semantics",
  verification: "Verification",
  "model-checking": "Model Checking",
  "theorem-proving": "Theorem Proving",
  logic: "Logic",
  automata: "Automata",
  concurrency: "Concurrency",
  compilers: "Compilers",
  "program-analysis": "Program Analysis",
  "program-synthesis": "Program Synthesis",
  "formal-methods": "Formal Methods",
  "software-engineering": "Software Engineering",
  "category-theory": "Category Theory",
  "proof-assistants": "Proof Assistants",
  "functional-programming": "Functional Programming",
  "logic-programming": "Logic Programming",
  quantum: "Quantum",
  probabilistic: "Probabilistic",
  security: "Security",
  systems: "Systems",
};

export function tagDisplayName(tag: Tag): string {
  return tagDisplayNames[tag];
}

export function eventKey(
  e: Pick<ScheduledEvent, "abbreviation" | "year">
): string {
  return `${e.abbreviation}-${e.year}`;
}

// The "’26" suffix the UI hangs off an abbreviation. Read off the edition year
// so it still renders for events whose exact dates are TBD.
export function eventYear2(e: Pick<ScheduledEvent, "year">): string {
  return String(e.year).slice(-2);
}

export function eventSlug(abbreviation: string): string {
  return abbreviation
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function eventPathFromSlug(year: number | string, slug: string): string {
  return `/event/${year}/${slug}/`;
}

export function eventPath(
  e: Pick<ScheduledEvent, "abbreviation" | "year">
): string {
  return eventPathFromSlug(e.year, eventSlug(e.abbreviation));
}

export function hasConcreteDates(e: Pick<ScheduledEvent, "date">): boolean {
  return e.date.start !== "TBD" && e.date.end !== "TBD";
}

export function icalFileName(
  e: Pick<ScheduledEvent, "abbreviation" | "year">,
  withDeadlines: boolean
): string {
  return `${eventKey(e)}${withDeadlines ? ".dates" : ""}.ics`;
}

export function icalFeedPath(
  e: Pick<ScheduledEvent, "abbreviation" | "year">,
  withDeadlines: boolean
): string {
  return `/ical/${icalFileName(e, withDeadlines)}`;
}

export function roundsWithDates(rounds: Round[]): Round[] {
  return rounds.filter((r) => Object.keys(r.importantDates).length > 0);
}

export function roundEntries(r: Round): Array<[DateName, MaybeDate]> {
  return Object.entries(r.importantDates) as Array<[DateName, MaybeDate]>;
}

export function roundDeadlines(r: Round): MaybeDate[] {
  return Object.values(r.importantDates);
}

export function allDeadlines(e: Pick<ScheduledEvent, "rounds">): MaybeDate[] {
  return e.rounds.flatMap(roundDeadlines);
}

export function firstDeadline(
  e: Pick<ScheduledEvent, "rounds">
): MaybeDate | undefined {
  const dates = allDeadlines(e);
  return dates.length === 0
    ? undefined
    : dates.reduce((min, d) => (d < min ? d : min));
}

export function isDeadline(name: DateName): boolean {
  // Some date-name entries describe an event the author receives rather than
  // a date they must submit by. Those aren't "deadlines" — surface them as
  // milestones instead of countdowns. Exhaustive switch on purpose so a new
  // DateName fails to compile until it's classified.
  switch (name) {
    case "abstract":
    case "paper":
    case "rebuttal":
    case "revisions":
    case "camera-ready":
      return true;
    case "notification":
    case "conditional-acceptance":
      return false;
  }
}

export function dateNameToReadable(name: DateName): string {
  switch (name) {
    case "abstract":
      return "Abstract";
    case "paper":
      return "Paper Submission";
    case "notification":
      return "Notification";
    case "conditional-acceptance":
      return "Conditional Acceptance Notification";
    case "revisions":
      return "Revisions";
    case "camera-ready":
      return "Camera Ready";
    case "rebuttal":
      return "Rebuttal";
  }
}

type LocaleArg = string | string[] | undefined;

export const dateFormatStyles = {
  long: { year: "numeric", month: "long", day: "numeric" },
  short: { year: "numeric", month: "short", day: "numeric" },
  compact: { year: "2-digit", month: "2-digit", day: "2-digit" },
  "long-with-time": {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  },
  "compact-with-time": {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateFormatStyle = keyof typeof dateFormatStyles;

const timeBearingStyles = new Set<DateFormatStyle>([
  "long-with-time",
  "compact-with-time",
]);

const aoeInstantCache = new Map<string, Date>();

export function toAoeInstant(date: MaybeDate): Date | null {
  if (date === "TBD") return null;
  const cached = aoeInstantCache.get(date);
  if (cached !== undefined) return cached;
  const iso = date.replaceAll("/", "-");
  const result = new Date(`${iso}T23:59:59.999-12:00`);
  aoeInstantCache.set(date, result);
  return result;
}

export function parseDateParts(date: string): [number, number, number] | null {
  const [y, m, d] = date.split(/[-/]/).map(Number);
  if (!y || !m || !d) return null;
  return [y, m, d];
}

const calendarDateCache = new Map<string, Date>();

// Local-tz midnight of the YAML calendar date — for *display*, where "May 25"
// should read "May 25" regardless of viewer tz. Distinct from toAoeInstant,
// which is the AOE moment and rolls the calendar day forward east of UTC-12.
export function toCalendarDate(date: MaybeDate): Date | null {
  if (date === "TBD") return null;
  const cached = calendarDateCache.get(date);
  if (cached !== undefined) return cached;
  const parts = parseDateParts(date);
  if (!parts) return null;
  const [y, m, d] = parts;
  const result = new Date(y, m - 1, d);
  calendarDateCache.set(date, result);
  return result;
}

export function isDeadlinePast(
  date: MaybeDate,
  now: Date = new Date()
): boolean {
  const instant = toAoeInstant(date);
  if (instant === null) return false;
  return instant.getTime() < now.getTime();
}

// 14 days
const URGENT_WINDOW_MS = 14 * 86_400_000;

export function isDeadlineUrgent(
  date: MaybeDate,
  now: Date = new Date()
): boolean {
  const instant = toAoeInstant(date);
  if (instant === null) return false;
  const ms = instant.getTime() - now.getTime();
  return ms > 0 && ms <= URGENT_WINDOW_MS;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  style: DateFormatStyle,
  locale: LocaleArg
): Intl.DateTimeFormat {
  const localeKey = Array.isArray(locale) ? locale.join(",") : (locale ?? "");
  const key = `${style}|${localeKey}`;
  let fmt = formatterCache.get(key);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat(locale, dateFormatStyles[style]);
    formatterCache.set(key, fmt);
  }
  return fmt;
}

export function formatDate(
  date: MaybeDate,
  style: DateFormatStyle,
  locale?: LocaleArg
): string {
  if (date === "TBD") return "TBD";
  const instant = timeBearingStyles.has(style)
    ? toAoeInstant(date)!
    : toCalendarDate(date)!;
  return getFormatter(style, locale).format(instant);
}

export function formatDateRange(
  start: MaybeDate,
  end: MaybeDate,
  style: DateFormatStyle,
  locale?: LocaleArg
): string {
  if (start === "TBD" || end === "TBD") return "TBD";
  return getFormatter(style, locale).formatRange(
    toCalendarDate(start)!,
    toCalendarDate(end)!
  );
}

export function toGoogleCalendarLink(
  e: Pick<ScheduledEvent, "abbreviation" | "date" | "name" | "location">
): string {
  if (!hasConcreteDates(e)) {
    return "";
  }
  const startParts = parseDateParts(e.date.start);
  const endParts = parseDateParts(e.date.end);
  if (!startParts || !endParts) return "";
  const encode = ([y, m, d]: [number, number, number]) =>
    `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
  const start = encode(startParts);
  const end = encode(endParts);
  const url = new URL("https://www.google.com/calendar/render");
  url.searchParams.append("action", "TEMPLATE");
  url.searchParams.append("text", e.abbreviation);
  url.searchParams.append("dates", `${start}/${end}`);
  url.searchParams.append("details", e.name);
  if (e.location) url.searchParams.append("location", e.location);
  url.searchParams.append("sf", "true");
  url.searchParams.append("output", "xml");

  return url.toString();
}
