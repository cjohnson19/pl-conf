import type {
  CalendarDate,
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
  CalendarDate,
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

export function hasConcreteDates<E extends Pick<ScheduledEvent, "date">>(
  e: E
): e is E & { date: { start: CalendarDate; end: CalendarDate } } {
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

// Some date-name entries describe an event the author receives rather than a
// date they must submit by; those are milestones, not deadlines. `label` is
// the full name, `short` the one the rows and rails use.
export const dateNames: Record<
  DateName,
  { label: string; short: string; deadline: boolean }
> = {
  abstract: { label: "Abstract", short: "Abstract", deadline: true },
  paper: { label: "Paper Submission", short: "Paper", deadline: true },
  notification: {
    label: "Notification",
    short: "Notification",
    deadline: false,
  },
  "conditional-acceptance": {
    label: "Conditional Acceptance Notification",
    short: "Conditional Acceptance",
    deadline: false,
  },
  rebuttal: { label: "Rebuttal", short: "Rebuttal", deadline: true },
  revisions: { label: "Revisions", short: "Revisions", deadline: true },
  "camera-ready": {
    label: "Camera Ready",
    short: "Camera-ready",
    deadline: true,
  },
};

export function parseDateParts(date: CalendarDate): [number, number, number] {
  const [y, m, d] = date.split("/").map(Number);
  return [y, m, d];
}

// The instant a deadline on this date expires: end of day Anywhere on Earth
// (UTC-12), i.e. 11:59:59.999 UTC the following day.
export function aoeTime(date: CalendarDate): number {
  const [y, m, d] = parseDateParts(date);
  return Date.UTC(y, m - 1, d + 1, 11, 59, 59, 999);
}

// Local-tz midnight of the calendar date, for display: "May 25" should read
// "May 25" regardless of viewer tz. Distinct from aoeTime, which rolls the
// calendar day forward east of UTC-12.
export function calendarDate(date: CalendarDate): Date {
  const [y, m, d] = parseDateParts(date);
  return new Date(y, m - 1, d);
}

export function isDeadlinePast(date: MaybeDate, now: Date): boolean {
  return date !== "TBD" && aoeTime(date) < now.getTime();
}

const URGENT_WINDOW_MS = 14 * 86_400_000;

export function isDeadlineUrgent(date: MaybeDate, now: Date): boolean {
  if (date === "TBD") return false;
  const ms = aoeTime(date) - now.getTime();
  return ms > 0 && ms <= URGENT_WINDOW_MS;
}

export function toGoogleCalendarLink(
  e: Pick<ScheduledEvent, "abbreviation" | "date" | "name" | "location">
): string {
  if (!hasConcreteDates(e)) return "";
  const compact = (d: CalendarDate) => d.replaceAll("/", "");
  const start = compact(e.date.start);
  const end = compact(e.date.end);
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
