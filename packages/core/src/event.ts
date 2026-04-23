import { isBefore, getYear } from "date-fns";
import { z } from "zod";
import * as ics from "ics";

const DateSchema = z
  .string()
  .date()
  // Date fns interprets dates with "-" as having a timezone which should be
  // converted into local time, but we want to treat them as "AOE" dates almost
  // always.
  .transform((d) => d.replaceAll("-", "/"));

const TBD = z.literal("TBD");

const MaybeDate = z.union([TBD, DateSchema]);

export type MaybeDate = z.infer<typeof MaybeDate>;

const DateName = z.enum([
  "abstract",
  "paper",
  "notification",
  "rebuttal",
  "conditional-acceptance",
  "camera-ready",
  "revisions",
]);

export type DateName = z.infer<typeof DateName>;

export const eventTypes = ["conference", "workshop", "symposium"] as const;

const EventType = z.enum(eventTypes);

export type EventType = z.infer<typeof EventType>;

const ImportantDates = z.record(DateName, MaybeDate);

const Round = z
  .object({
    name: z.string().nonempty().optional(),
    importantDates: ImportantDates.default({}),
  })
  .strict();

export type Round = z.infer<typeof Round>;

const ScheduledEventNormalized = z
  .object({
    name: z.string().nonempty(),
    abbreviation: z.string().nonempty(),
    date: z
      .object({
        start: MaybeDate,
        end: MaybeDate,
      })
      .optional()
      .default({ start: "TBD", end: "TBD" }),
    location: z.string().optional(),
    importantDateUrl: z.string().url().optional(),
    format: z.string().optional(),
    url: z.string().url().optional(),
    submissionUrl: z.string().url().optional(),
    rounds: z.array(Round).default([]),
    notes: z.string().array().default([]),
    type: EventType,
    tags: z.array(z.string()).default([]),
    lastUpdated: DateSchema,
  })
  .strict();

export const ScheduledEvent = z
  .preprocess((raw) => {
    if (raw === null || typeof raw !== "object") return raw;
    const r = raw as Record<string, unknown>;
    const hasFlat = "importantDates" in r && r.importantDates !== undefined;
    const hasRounds = "rounds" in r && r.rounds !== undefined;
    if (hasFlat && hasRounds) return raw;
    if (hasFlat) {
      const { importantDates, ...rest } = r;
      return { ...rest, rounds: [{ importantDates }] };
    }
    return raw;
  }, ScheduledEventNormalized)
  .refine(
    (data) =>
      data.rounds.every((r) => Object.keys(r.importantDates).length === 0) ||
      data.importantDateUrl,
    {
      message: "A reference url must be provided if there are important dates",
      path: ["importantDateUrl"],
    }
  )
  .refine(
    (data) => {
      if (data.date?.start === "TBD" || data.date?.end === "TBD") return true;
      return (
        data.date?.start === data.date?.end ||
        isBefore(data.date?.start, data.date?.end)
      );
    },
    {
      message: "Event's start must be the same or before the end",
      path: ["date"],
    }
  );

export const SubmissionSchema = z
  .object({
    name: z.string().nonempty(),
    abbreviation: z.string().nonempty(),
    date: z
      .object({
        start: MaybeDate,
        end: MaybeDate,
      })
      .optional()
      .default({ start: "TBD", end: "TBD" }),
    location: z.string().optional(),
    importantDateUrl: z.string().url().optional(),
    url: z.string().url().optional(),
    submissionUrl: z.string().url().optional(),
    importantDates: ImportantDates.default({}),
    notes: z.string().array().default([]),
    type: EventType,
  })
  .strict();

export type ScheduledEvent = z.infer<typeof ScheduledEvent>;
export type SubmissionSchema = z.infer<typeof SubmissionSchema>;

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

export function toICal(
  e: ScheduledEvent,
  includeDates: boolean = false
): string {
  if (e.date.start === "TBD" || e.date.end === "TBD") {
    return "";
  }
  const start = new Date(e.date.start);
  const end = new Date(e.date.end);
  const iCalEvent = ics.createEvents(
    [
      {
        start: [start.getFullYear(), start.getMonth() + 1, start.getDate()],
        end: [end.getFullYear(), end.getMonth() + 1, end.getDate()],
        title: e.abbreviation,
        description: e.name,
        location: e.location,
        url: e.url,
        categories: [e.type, ...e.tags],
      },
      ...(!includeDates
        ? []
        : e.rounds.flatMap((round) =>
            Object.entries(round.importantDates).flatMap(([type, date]) => {
              if (date === "TBD") {
                return [];
              }
              const d = new Date(date);
              const readable = dateNameToReadable(type as DateName);
              const roundLabel = round.name ? `${round.name} – ` : "";
              return [
                {
                  start: [
                    d.getFullYear(),
                    d.getMonth() + 1,
                    d.getDate(),
                  ] as ics.DateTime,
                  end: [
                    d.getFullYear(),
                    d.getMonth() + 1,
                    d.getDate(),
                  ] as ics.DateTime,
                  title: `${e.abbreviation}: ${roundLabel}${readable}`,
                  description: `${e.name}: ${roundLabel}${readable}`,
                  url: e.url,
                },
              ];
            })
          )),
    ],
    {
      productId: "pl-conferences/ics",
      method: "PUBLISH",
    }
  );
  if (iCalEvent.error) {
    throw new Error(iCalEvent.error.message);
  }
  return iCalEvent.value!;
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
