import { format } from "date-fns";
import YAML from "yaml";
import { z } from "zod";
import { createEvents } from "ics";

type MaybeDate = "TBD" | string;

const makeDateOrTBD = (date: "TBD" | string): string | "TBD" => {
  const res = date === "TBD" ? "TBD" : new Date(date);
  if (res !== "TBD" && isNaN(res.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  return date;
};

export function hasDate(date: MaybeDate | undefined): date is string {
  return date !== undefined && date !== "TBD";
}

const DateSchema = z.string().date();

const TBD = z.literal("TBD");

const EventType = z.enum(["conference", "workshop", "journal"]);

export type EventType = z.infer<typeof EventType>;

const EventInput = z.object({
  name: z.string().nonempty(),
  abbreviation: z.string().nonempty(),
  date: z
    .object({
      start: z.union([TBD, DateSchema]),
      end: z.union([TBD, DateSchema]),
    })
    .optional()
    .default({ start: "TBD", end: "TBD" }),
  location: z.string().optional(),
  format: z.string().optional(),
  url: z.string().url().optional(),
  deadlines: z.record(z.union([TBD, DateSchema])).default({}),
  type: EventType,
  tags: z.array(z.string()).default([]),
});

export type EventInput = z.infer<typeof EventInput>;

export interface ScheduledEvent {
  name: string;
  abbreviation: string;
  date: {
    start: MaybeDate;
    end: MaybeDate;
  };
  location?: string;
  format?: string;
  url?: string;
  deadlines: {
    [deadline: string]: MaybeDate;
  };
  type: EventType;
  tags: string[];
}

export function dateToString(date: MaybeDate): string {
  if (date === "TBD") {
    return "TBD";
  }
  return format(date, "PPP");
}

export function fromYaml(yaml: string): ScheduledEvent[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = YAML.parse(yaml) as any[];
  const parseRes = z.array(EventInput).safeParse(data);
  if (parseRes.success === false) {
    throw new Error(
      parseRes.error.errors.map((e) => `${e.path}: ${e.message}`).join("\n"),
    );
  } else {
    return parseRes.data.map((event) => {
      const startDate = makeDateOrTBD(event.date.start);
      const endDate = makeDateOrTBD(event.date.end);
      const deadlines = event?.deadlines
        ? Object.fromEntries(
            Object.entries(event.deadlines).map(([type, value]) => [
              type,
              makeDateOrTBD(value as string),
            ]),
          )
        : {};

      return {
        ...event,
        date: {
          start: startDate,
          end: endDate,
        },
        deadlines,
        tags: event.tags ?? [],
      } as ScheduledEvent;
    });
  }
}

export function toICal(e: ScheduledEvent): string {
  if (e.date.start === "TBD" || e.date.end === "TBD") {
    return "";
  }
  const start = new Date(e.date.start);
  const end = new Date(e.date.end);
  const iCalEvent = createEvents(
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
