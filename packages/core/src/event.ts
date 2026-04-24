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
  function encodeDate(date: Date): string {
    return date.toISOString().replace(/T.*$/g, "");
  }
  if (e.date.start === "TBD" || e.date.end === "TBD") {
    return "";
  }
  const start = encodeDate(new Date(e.date.start));
  const end = encodeDate(new Date(e.date.end));
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
