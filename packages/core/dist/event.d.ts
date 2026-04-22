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
export declare function allDeadlines(e: ScheduledEvent): MaybeDate[];
export declare function firstDeadline(e: ScheduledEvent): MaybeDate | undefined;
export declare function hasMultipleRounds(e: ScheduledEvent): boolean;
export declare function dateNameToReadable(name: DateName): string;
type LocaleArg = string | string[] | undefined;
declare const dateFormatStyles: {
    readonly long: {
        readonly year: "numeric";
        readonly month: "long";
        readonly day: "numeric";
    };
    readonly short: {
        readonly year: "numeric";
        readonly month: "short";
        readonly day: "numeric";
    };
    readonly compact: {
        readonly year: "2-digit";
        readonly month: "2-digit";
        readonly day: "2-digit";
    };
    readonly year2: {
        readonly year: "2-digit";
    };
};
export type DateFormatStyle = keyof typeof dateFormatStyles;
export declare function formatDate(date: MaybeDate, style: DateFormatStyle, locale?: LocaleArg): string;
export declare function formatDateRange(start: MaybeDate, end: MaybeDate, style: DateFormatStyle, locale?: LocaleArg): string;
export declare function toICal(e: ScheduledEvent, includeDates?: boolean): string;
export declare function toGoogleCalendarLink(e: ScheduledEvent): string;
export {};
//# sourceMappingURL=event.d.ts.map