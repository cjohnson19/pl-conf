import { format } from "date-fns";
import YAML from "yaml";
import { z } from "zod";

type UtcOrLocalDate = "TBD" | Date;

const makeDateOrTBD = (date: "TBD" | string): Date | "TBD" => {
  const res = date === "TBD" ? "TBD" : new Date(date);
  if (res !== "TBD" && isNaN(res.getTime())) {
    // throw new Error(`Invalid date: ${date}`);
    console.warn(`Invalid date: ${date}`);
    return "TBD";
  }
  return res;
};

export function hasDate(date: UtcOrLocalDate | undefined): date is Date {
  return date !== undefined && date !== "TBD";
}

const dateSchema = z.string().date();
// .datetime({ local: true })
// .refine((d) => !d.endsWith("Z"), { message: "Expected local datetime" });

const tbd = z.literal("TBD");

const EventType = z.enum(["conference", "workshop", "journal"]);

export type EventType = z.infer<typeof EventType>;

const EventInput = z.object({
  name: z.string().nonempty(),
  abbreviation: z.string().nonempty(),
  date: z
    .object({
      start: z.union([tbd, dateSchema]),
      end: z.union([tbd, dateSchema]),
    })
    .optional()
    .default({ start: "TBD", end: "TBD" }),
  location: z.string().optional(),
  format: z.string().optional(),
  url: z.string().url().optional(),
  deadlines: z.record(z.union([tbd, dateSchema])).default({}),
  type: EventType,
  tags: z.array(z.string()).default([]),
});

export type EventInput = z.infer<typeof EventInput>;

export interface ScheduledEvent {
  name: string;
  abbreviation: string;
  date: {
    start: UtcOrLocalDate;
    end: UtcOrLocalDate;
  };
  location?: string;
  format?: string;
  url?: string;
  deadlines: {
    [deadline: string]: UtcOrLocalDate;
  };
  type: EventType;
  tags: string[];
}

export function dateToString(date: UtcOrLocalDate): string {
  if (date === "TBD") {
    return "TBD";
  }
  return format(date, "PPP");
}

export function fromYaml(yaml: string): ScheduledEvent[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = YAML.parse(yaml) as any[];
  const parseRes = z.array(EventInput).safeParse(data); // validate data
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
