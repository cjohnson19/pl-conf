import { getYear } from "date-fns";
import type { DateName, MaybeDate, ScheduledEvent } from "./schemas.js";

export const eventTypes = ["conference", "workshop", "symposium"] as const;

export type {
  MaybeDate,
  DateName,
  EventType,
  Round,
  ScheduledEvent,
  SubmissionSchema,
} from "./schemas.js";

export function eventKey(e: ScheduledEvent): string {
  return `${e.abbreviation}-${getYear(e.date.start)}`;
}

export function hasConcreteDates(e: ScheduledEvent): boolean {
  return e.date.start !== "TBD" && e.date.end !== "TBD";
}

export function icalFileName(
  e: ScheduledEvent,
  withDeadlines: boolean
): string {
  return `${eventKey(e)}${withDeadlines ? ".dates" : ""}.ics`;
}

export function icalFeedPath(
  e: ScheduledEvent,
  withDeadlines: boolean
): string {
  return `/ical/${icalFileName(e, withDeadlines)}`;
}

export function allDeadlines(e: ScheduledEvent): MaybeDate[] {
  return e.rounds.flatMap((r) => Object.values(r.importantDates));
}

export function firstDeadline(e: ScheduledEvent): MaybeDate | undefined {
  const dates = allDeadlines(e);
  return dates.length === 0
    ? undefined
    : dates.reduce((min, d) => (d < min ? d : min));
}

export function hasMultipleRounds(e: ScheduledEvent): boolean {
  return e.rounds.length > 1 || e.rounds.some((r) => r.name !== undefined);
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

const dateFormatStyles = {
  long: { year: "numeric", month: "long", day: "numeric" },
  short: { year: "numeric", month: "short", day: "numeric" },
  compact: { year: "2-digit", month: "2-digit", day: "2-digit" },
  year2: { year: "2-digit" },
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

export function toAoeInstant(date: MaybeDate): Date | null {
  if (date === "TBD") return null;
  const iso = date.replaceAll("/", "-");
  return new Date(`${iso}T23:59:59.999-12:00`);
}

export function parseDateParts(date: string): [number, number, number] | null {
  const [y, m, d] = date.split(/[-/]/).map(Number);
  if (!y || !m || !d) return null;
  return [y, m, d];
}

// Local-tz midnight of the YAML calendar date — for *display*, where "May 25"
// should read "May 25" regardless of viewer tz. Distinct from toAoeInstant,
// which is the AOE moment and rolls the calendar day forward east of UTC-12.
export function toCalendarDate(date: MaybeDate): Date | null {
  if (date === "TBD") return null;
  const parts = parseDateParts(date);
  if (!parts) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
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
export const URGENT_WINDOW_MS = 14 * 86_400_000;

export function isDeadlineUrgent(
  date: MaybeDate,
  now: Date = new Date()
): boolean {
  const instant = toAoeInstant(date);
  if (instant === null) return false;
  const ms = instant.getTime() - now.getTime();
  return ms > 0 && ms <= URGENT_WINDOW_MS;
}

export function formatDate(
  date: MaybeDate,
  style: DateFormatStyle,
  locale?: LocaleArg
): string {
  if (date === "TBD") return "TBD";
  const instant = timeBearingStyles.has(style)
    ? toAoeInstant(date)!
    : new Date(date);
  return new Intl.DateTimeFormat(locale, dateFormatStyles[style]).format(
    instant
  );
}

export function formatDateRange(
  start: MaybeDate,
  end: MaybeDate,
  style: DateFormatStyle,
  locale?: LocaleArg
): string {
  if (start === "TBD" || end === "TBD") return "TBD";
  return new Intl.DateTimeFormat(locale, dateFormatStyles[style]).formatRange(
    new Date(start),
    new Date(end)
  );
}

export function toGoogleCalendarLink(e: ScheduledEvent): string {
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
