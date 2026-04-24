import { isBefore } from "date-fns";
import { z } from "zod";
import { eventTypes } from "./event.js";

const DateSchema = z
  .string()
  .date()
  // Date fns interprets dates with "-" as having a timezone which should be
  // converted into local time, but we want to treat them as "AOE" dates almost
  // always.
  .transform((d) => d.replaceAll("-", "/"));

const TBD = z.literal("TBD");

export const MaybeDate = z.union([TBD, DateSchema]);
export type MaybeDate = z.infer<typeof MaybeDate>;

export const DateName = z.enum([
  "abstract",
  "paper",
  "notification",
  "rebuttal",
  "conditional-acceptance",
  "camera-ready",
  "revisions",
]);
export type DateName = z.infer<typeof DateName>;

export const EventType = z.enum(eventTypes);
export type EventType = z.infer<typeof EventType>;

const ImportantDates = z.record(DateName, MaybeDate);

export const Round = z
  .object({
    name: z.string().nonempty().optional(),
    importantDates: ImportantDates.default({}),
  })
  .strict();

export type Round = z.infer<typeof Round>;

const AbbreviationList = z
  .preprocess(
    (v) => (typeof v === "string" ? [v] : v),
    z.array(z.string().nonempty())
  )
  .default([]);

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
    partOf: AbbreviationList,
    colocatedWith: AbbreviationList,
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

export type ScheduledEvent = z.infer<typeof ScheduledEvent>;

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
    partOf: AbbreviationList,
    colocatedWith: AbbreviationList,
  })
  .strict();

export type SubmissionSchema = z.infer<typeof SubmissionSchema>;
