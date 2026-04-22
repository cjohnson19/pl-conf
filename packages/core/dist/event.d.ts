import { z } from "zod";
declare const MaybeDate: z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>;
export type MaybeDate = z.infer<typeof MaybeDate>;
declare const DateName: z.ZodEnum<["abstract", "paper", "notification", "rebuttal", "conditional-acceptance", "camera-ready", "revisions"]>;
export type DateName = z.infer<typeof DateName>;
export declare const eventTypes: readonly ["conference", "workshop", "symposium"];
declare const EventType: z.ZodEnum<["conference", "workshop", "symposium"]>;
export type EventType = z.infer<typeof EventType>;
declare const Round: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    importantDates: z.ZodDefault<z.ZodRecord<z.ZodEnum<["abstract", "paper", "notification", "rebuttal", "conditional-acceptance", "camera-ready", "revisions"]>, z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>>>;
}, "strict", z.ZodTypeAny, {
    importantDates: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>>;
    name?: string | undefined;
}, {
    name?: string | undefined;
    importantDates?: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>> | undefined;
}>;
export type Round = z.infer<typeof Round>;
export declare const ScheduledEvent: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    abbreviation: z.ZodString;
    date: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        start: z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>;
        end: z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>>>;
    location: z.ZodOptional<z.ZodString>;
    importantDateUrl: z.ZodOptional<z.ZodString>;
    submissionSchemeUrl: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    submissionUrl: z.ZodOptional<z.ZodString>;
    rounds: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        importantDates: z.ZodDefault<z.ZodRecord<z.ZodEnum<["abstract", "paper", "notification", "rebuttal", "conditional-acceptance", "camera-ready", "revisions"]>, z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>>>;
    }, "strict", z.ZodTypeAny, {
        importantDates: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>>;
        name?: string | undefined;
    }, {
        name?: string | undefined;
        importantDates?: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>> | undefined;
    }>, "many">>;
    notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    type: z.ZodEnum<["conference", "workshop", "symposium"]>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    lastUpdated: z.ZodEffects<z.ZodString, string, string>;
}, "strict", z.ZodTypeAny, {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    date: {
        start: string;
        end: string;
    };
    rounds: {
        importantDates: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>>;
        name?: string | undefined;
    }[];
    notes: string[];
    tags: string[];
    lastUpdated: string;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    submissionSchemeUrl?: string | undefined;
    format?: string | undefined;
    url?: string | undefined;
    submissionUrl?: string | undefined;
}, {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    lastUpdated: string;
    date?: {
        start: string;
        end: string;
    } | undefined;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    submissionSchemeUrl?: string | undefined;
    format?: string | undefined;
    url?: string | undefined;
    submissionUrl?: string | undefined;
    rounds?: {
        name?: string | undefined;
        importantDates?: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>> | undefined;
    }[] | undefined;
    notes?: string[] | undefined;
    tags?: string[] | undefined;
}>, {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    date: {
        start: string;
        end: string;
    };
    rounds: {
        importantDates: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>>;
        name?: string | undefined;
    }[];
    notes: string[];
    tags: string[];
    lastUpdated: string;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    submissionSchemeUrl?: string | undefined;
    format?: string | undefined;
    url?: string | undefined;
    submissionUrl?: string | undefined;
}, unknown>, {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    date: {
        start: string;
        end: string;
    };
    rounds: {
        importantDates: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>>;
        name?: string | undefined;
    }[];
    notes: string[];
    tags: string[];
    lastUpdated: string;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    submissionSchemeUrl?: string | undefined;
    format?: string | undefined;
    url?: string | undefined;
    submissionUrl?: string | undefined;
}, unknown>, {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    date: {
        start: string;
        end: string;
    };
    rounds: {
        importantDates: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>>;
        name?: string | undefined;
    }[];
    notes: string[];
    tags: string[];
    lastUpdated: string;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    submissionSchemeUrl?: string | undefined;
    format?: string | undefined;
    url?: string | undefined;
    submissionUrl?: string | undefined;
}, unknown>;
export declare const SubmissionSchema: z.ZodObject<{
    name: z.ZodString;
    abbreviation: z.ZodString;
    date: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        start: z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>;
        end: z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>>>;
    location: z.ZodOptional<z.ZodString>;
    importantDateUrl: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    submissionUrl: z.ZodOptional<z.ZodString>;
    importantDates: z.ZodDefault<z.ZodRecord<z.ZodEnum<["abstract", "paper", "notification", "rebuttal", "conditional-acceptance", "camera-ready", "revisions"]>, z.ZodUnion<[z.ZodLiteral<"TBD">, z.ZodEffects<z.ZodString, string, string>]>>>;
    notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    type: z.ZodEnum<["conference", "workshop", "symposium"]>;
}, "strict", z.ZodTypeAny, {
    type: "conference" | "workshop" | "symposium";
    name: string;
    importantDates: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>>;
    abbreviation: string;
    date: {
        start: string;
        end: string;
    };
    notes: string[];
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    url?: string | undefined;
    submissionUrl?: string | undefined;
}, {
    type: "conference" | "workshop" | "symposium";
    name: string;
    abbreviation: string;
    importantDates?: Partial<Record<"abstract" | "paper" | "notification" | "rebuttal" | "conditional-acceptance" | "camera-ready" | "revisions", string>> | undefined;
    date?: {
        start: string;
        end: string;
    } | undefined;
    location?: string | undefined;
    importantDateUrl?: string | undefined;
    url?: string | undefined;
    submissionUrl?: string | undefined;
    notes?: string[] | undefined;
}>;
export type ScheduledEvent = z.infer<typeof ScheduledEvent>;
export type SubmissionSchema = z.infer<typeof SubmissionSchema>;
export declare function eventKey(e: ScheduledEvent): string;
export declare function allDeadlines(e: ScheduledEvent): [DateName, MaybeDate][];
export declare function hasMultipleRounds(e: ScheduledEvent): boolean;
export declare function dateNameToReadable(name: DateName): string;
export declare function dateToString(date: MaybeDate): string;
export declare function dateToCompactString(date: MaybeDate, locale?: string | string[]): string;
export declare function dateRangeToString(start: MaybeDate, end: MaybeDate): string;
export declare function dateRangeToCompactString(start: MaybeDate, end: MaybeDate): string;
export declare function toICal(e: ScheduledEvent, includeDates?: boolean): string;
export declare function toGoogleCalendarLink(e: ScheduledEvent): string;
export {};
//# sourceMappingURL=event.d.ts.map