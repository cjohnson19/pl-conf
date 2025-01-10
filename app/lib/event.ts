import { format } from "date-fns";
import YAML from "yaml";
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

const EventType = z.enum(["conference", "workshop", "journal"]);

export type EventType = z.infer<typeof EventType>;

const ScheduledEvent = z
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
    importantDates: z.record(DateName, z.union([TBD, DateSchema])).default({}),
    type: EventType,
    tags: z.array(z.string()).default([]),
    lastUpdated: DateSchema,
  })
  .refine(
    (data) =>
      Object.keys(data.importantDates).length === 0 || data.importantDateUrl,
    {
      message: "A reference url must be provided if there are important dates",
      path: ["importantDateUrl", "importantDates"],
    },
  );

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

export type ScheduledEvent = z.infer<typeof ScheduledEvent>;

export function dateToString(date: MaybeDate): string {
  if (date === "TBD") {
    return "TBD";
  }
  return format(date, "PPP");
}

export function fromYaml(yaml: string): ScheduledEvent[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = YAML.parse(yaml) as any[];
  const parseRes = z.array(ScheduledEvent).safeParse(data);
  if (parseRes.success === false) {
    throw new Error(
      parseRes.error.errors.map((e) => `${e.path}: ${e.message}`).join("\n"),
    );
  } else {
    return parseRes.data;
  }
}

export function toICal(
  e: ScheduledEvent,
  includeDates: boolean = false,
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
        : Object.entries(e.importantDates).flatMap(([type, date]) => {
            if (date === "TBD") {
              return [];
            }
            const d = new Date(date);
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
                title: `${e.abbreviation}: ${dateNameToReadable(
                  type as DateName,
                )}`,
                description: `${e.name}: ${dateNameToReadable(
                  type as DateName,
                )}`,
                url: e.url,
              },
            ];
          })),
    ],
    {
      productId: "pl-conferences/ics",
      method: "PUBLISH",
    },
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
