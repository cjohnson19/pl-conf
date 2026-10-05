import { z } from "zod";
import { eventTypes, tagValues } from "./event";

// A YAML calendar date, zero-padded, with the separators swapped to "/" so
// `new Date(string)` and date-fns read it as local time rather than UTC. Zod's
// inferred output would be plain `string`, so the type is spelled out: the
// template literal lets `=== "TBD"` narrow a MaybeDate.
export type CalendarDate = `${number}/${number}/${number}`;

const DateSchema = z
  .string()
  .date()
  .transform((d): CalendarDate => d.replaceAll("-", "/") as CalendarDate);

export const MaybeDate = z.union([z.literal("TBD"), DateSchema]);
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

export const Tag = z.enum(tagValues);
export type Tag = z.infer<typeof Tag>;

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
    // The edition year, supplied by the generator from the containing
    // yaml/{year}/ directory rather than read from YAML. Identity (keys,
    // routes, same-year relations) hangs off this, so an event whose exact
    // dates are still TBD is still addressable.
    year: z.number().int(),
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
    tags: z.array(Tag).default([]),
    partOf: AbbreviationList,
    colocatedWith: AbbreviationList,
    lastUpdated: DateSchema,
    sequence: z.number().int().nonnegative(),
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
  // Zero-padded "YYYY/MM/DD" strings compare and slice as dates do.
  .refine(
    (data) =>
      data.date.start === "TBD" ||
      data.date.end === "TBD" ||
      data.date.start <= data.date.end,
    {
      message: "Event's start must be the same or before the end",
      path: ["date"],
    }
  )
  .refine(
    (data) =>
      [data.date.start, data.date.end]
        .filter((d) => d !== "TBD")
        .every((d) => Number(d.slice(0, 4)) === data.year),
    {
      message:
        "Event's dates must fall within the year of its containing directory",
      path: ["date"],
    }
  );

export type ScheduledEvent = z.infer<typeof ScheduledEvent>;

export const SubmissionSchema = z
  .object({
    url: z.string().url().max(2048),
  })
  .strict();

export type SubmissionSchema = z.infer<typeof SubmissionSchema>;
