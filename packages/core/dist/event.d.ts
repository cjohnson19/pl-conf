import { z } from "zod";
declare const MaybeDate: z.ZodUnion<
  [z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]
>;
export type MaybeDate = z.infer<typeof MaybeDate>;
declare const DateName: z.ZodEnum<
  [
    "abstract",
    "paper",
    "notification",
    "rebuttal",
    "conditional-acceptance",
    "camera-ready",
    "revisions",
  ]
>;
export type DateName = z.infer<typeof DateName>;
export declare const eventTypes: readonly [
  "conference",
  "workshop",
  "symposium",
];
declare const EventType: z.ZodEnum<["conference", "workshop", "symposium"]>;
export type EventType = z.infer<typeof EventType>;
export declare const ScheduledEvent: z.ZodEffects<
  z.ZodEffects<
    z.ZodObject<
      {
        name: z.ZodString;
        abbreviation: z.ZodString;
        date: z.ZodDefault<
          z.ZodOptional<
            z.ZodObject<
              {
                start: z.ZodUnion<
                  [
                    z.ZodLiteral<"TBD">,
                    z.ZodEffects<z.ZodString, string, string>,
                  ]
                >;
                end: z.ZodUnion<
                  [
                    z.ZodLiteral<"TBD">,
                    z.ZodEffects<z.ZodString, string, string>,
                  ]
                >;
              },
              "strip",
              z.ZodTypeAny,
              {
                start: string;
                end: string;
              },
              {
                start: string;
                end: string;
              }
            >
          >
        >;
        location: z.ZodOptional<z.ZodString>;
        importantDateUrl: z.ZodOptional<z.ZodString>;
        format: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        importantDates: z.ZodDefault<
          z.ZodRecord<
            z.ZodEnum<
              [
                "abstract",
                "paper",
                "notification",
                "rebuttal",
                "conditional-acceptance",
                "camera-ready",
                "revisions",
              ]
            >,
            z.ZodUnion<
              [z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]
            >
          >
        >;
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        type: z.ZodEnum<["conference", "workshop", "symposium"]>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        lastUpdated: z.ZodEffects<z.ZodString, string, string>;
      },
      "strict",
      z.ZodTypeAny,
      {
        type: "conference" | "workshop" | "symposium";
        name: string;
        abbreviation: string;
        date: {
          start: string;
          end: string;
        };
        importantDates: Partial<
          Record<
            | "abstract"
            | "paper"
            | "notification"
            | "rebuttal"
            | "conditional-acceptance"
            | "camera-ready"
            | "revisions",
            string
          >
        >;
        notes: string[];
        tags: string[];
        lastUpdated: string;
        location?: string | undefined;
        importantDateUrl?: string | undefined;
        format?: string | undefined;
        url?: string | undefined;
      },
      {
        type: "conference" | "workshop" | "symposium";
        name: string;
        abbreviation: string;
        lastUpdated: string;
        date?:
          | {
              start: string;
              end: string;
            }
          | undefined;
        location?: string | undefined;
        importantDateUrl?: string | undefined;
        format?: string | undefined;
        url?: string | undefined;
        importantDates?:
          | Partial<
              Record<
                | "abstract"
                | "paper"
                | "notification"
                | "rebuttal"
                | "conditional-acceptance"
                | "camera-ready"
                | "revisions",
                string
              >
            >
          | undefined;
        notes?: string[] | undefined;
        tags?: string[] | undefined;
      }
    >,
    {
      type: "conference" | "workshop" | "symposium";
      name: string;
      abbreviation: string;
      date: {
        start: string;
        end: string;
      };
      importantDates: Partial<
        Record<
          | "abstract"
          | "paper"
          | "notification"
          | "rebuttal"
          | "conditional-acceptance"
          | "camera-ready"
          | "revisions",
          string
        >
      >;
      notes: string[];
      tags: string[];
      lastUpdated: string;
      location?: string | undefined;
      importantDateUrl?: string | undefined;
      format?: string | undefined;
      url?: string | undefined;
    },
    {
      type: "conference" | "workshop" | "symposium";
      name: string;
      abbreviation: string;
      lastUpdated: string;
      date?:
        | {
            start: string;
            end: string;
          }
        | undefined;
      location?: string | undefined;
      importantDateUrl?: string | undefined;
      format?: string | undefined;
      url?: string | undefined;
      importantDates?:
        | Partial<
            Record<
              | "abstract"
              | "paper"
              | "notification"
              | "rebuttal"
              | "conditional-acceptance"
              | "camera-ready"
              | "revisions",
              string
            >
          >
        | undefined;
      notes?: string[] | undefined;
      tags?: string[] | undefined;
    }
  >,
  {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    date: {
      start: string;
      end: string;
    };
    importantDates: Partial<
      Record<
        | "abstract"
        | "paper"
        | "notification"
        | "rebuttal"
        | "conditional-acceptance"
        | "camera-ready"
        | "revisions",
        string
      >
    >;
    notes: string[];
    tags: string[];
    lastUpdated: string;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    format?: string | undefined;
    url?: string | undefined;
  },
  {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    lastUpdated: string;
    date?:
      | {
          start: string;
          end: string;
        }
      | undefined;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    format?: string | undefined;
    url?: string | undefined;
    importantDates?:
      | Partial<
          Record<
            | "abstract"
            | "paper"
            | "notification"
            | "rebuttal"
            | "conditional-acceptance"
            | "camera-ready"
            | "revisions",
            string
          >
        >
      | undefined;
    notes?: string[] | undefined;
    tags?: string[] | undefined;
  }
>;
export declare const SubmissionSchema: z.ZodObject<
  {
    name: z.ZodString;
    abbreviation: z.ZodString;
    date: z.ZodDefault<
      z.ZodOptional<
        z.ZodObject<
          {
            start: z.ZodUnion<
              [z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]
            >;
            end: z.ZodUnion<
              [z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]
            >;
          },
          "strip",
          z.ZodTypeAny,
          {
            start: string;
            end: string;
          },
          {
            start: string;
            end: string;
          }
        >
      >
    >;
    location: z.ZodOptional<z.ZodString>;
    importantDateUrl: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    importantDates: z.ZodDefault<
      z.ZodRecord<
        z.ZodEnum<
          [
            "abstract",
            "paper",
            "notification",
            "rebuttal",
            "conditional-acceptance",
            "camera-ready",
            "revisions",
          ]
        >,
        z.ZodUnion<
          [z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]
        >
      >
    >;
    notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    type: z.ZodEnum<["conference", "workshop", "symposium"]>;
  },
  "strict",
  z.ZodTypeAny,
  {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    date: {
      start: string;
      end: string;
    };
    importantDates: Partial<
      Record<
        | "abstract"
        | "paper"
        | "notification"
        | "rebuttal"
        | "conditional-acceptance"
        | "camera-ready"
        | "revisions",
        string
      >
    >;
    notes: string[];
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    url?: string | undefined;
  },
  {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    date?:
      | {
          start: string;
          end: string;
        }
      | undefined;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    url?: string | undefined;
    importantDates?:
      | Partial<
          Record<
            | "abstract"
            | "paper"
            | "notification"
            | "rebuttal"
            | "conditional-acceptance"
            | "camera-ready"
            | "revisions",
            string
          >
        >
      | undefined;
    notes?: string[] | undefined;
  }
>;
export type ScheduledEvent = z.infer<typeof ScheduledEvent>;
export type SubmissionSchema = z.infer<typeof SubmissionSchema>;
export declare function dateNameToReadable(name: DateName): string;
export declare function dateToString(date: MaybeDate): string;
export declare function dateRangeToString(
  start: MaybeDate,
  end: MaybeDate
): string;
export declare function dateRangeToCompactString(
  start: MaybeDate,
  end: MaybeDate
): string;
export declare function toICal(
  e: ScheduledEvent,
  includeDates?: boolean
): string;
export declare function toGoogleCalendarLink(e: ScheduledEvent): string;
export {};
//# sourceMappingURL=event.d.ts.map
