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
const DateName = z.enum([
    "abstract",
    "paper",
    "notification",
    "rebuttal",
    "conditional-acceptance",
    "camera-ready",
    "revisions",
]);
export const eventTypes = ["conference", "workshop", "symposium"];
const EventType = z.enum(eventTypes);
const ImportantDates = z.record(DateName, MaybeDate);
const Round = z
    .object({
    name: z.string().nonempty().optional(),
    importantDates: ImportantDates.default({}),
})
    .strict();
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
    submissionSchemeUrl: z.string().url().optional(),
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
    if (raw === null || typeof raw !== "object")
        return raw;
    const r = raw;
    const hasFlat = "importantDates" in r && r.importantDates !== undefined;
    const hasRounds = "rounds" in r && r.rounds !== undefined;
    if (hasFlat && hasRounds) {
        // Let strict() reject — importantDates is not a known key on the
        // normalized schema, so the error will be "Unrecognized key(s):
        // 'importantDates'" which is a reasonable signal.
        return raw;
    }
    if (hasFlat) {
        const { importantDates, ...rest } = r;
        return { ...rest, rounds: [{ importantDates }] };
    }
    return raw;
}, ScheduledEventNormalized)
    .refine((data) => data.rounds.every((r) => Object.keys(r.importantDates).length === 0) ||
    data.importantDateUrl, {
    message: "A reference url must be provided if there are important dates",
    path: ["importantDateUrl"],
})
    .refine((data) => {
    if (data.date?.start === "TBD" || data.date?.end === "TBD")
        return true;
    return (data.date?.start === data.date?.end ||
        isBefore(data.date?.start, data.date?.end));
}, {
    message: "Event's start must be the same or before the end",
    path: ["date"],
});
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
export function eventKey(e) {
    return `${e.abbreviation}-${getYear(e.date.start)}`;
}
export function allDeadlines(e) {
    return e.rounds.flatMap((r) => Object.entries(r.importantDates));
}
export function hasMultipleRounds(e) {
    return e.rounds.length > 1 || e.rounds.some((r) => r.name !== undefined);
}
// Utility functions
export function dateNameToReadable(name) {
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
const longDateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
};
const shortDateOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
};
const compactDateOptions = {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
};
export function dateToString(date, locale) {
    if (date === "TBD") {
        return "TBD";
    }
    return new Intl.DateTimeFormat(locale, longDateOptions).format(new Date(date));
}
export function dateToShortString(date, locale) {
    if (date === "TBD") {
        return "TBD";
    }
    return new Intl.DateTimeFormat(locale, shortDateOptions).format(new Date(date));
}
export function dateToCompactString(date, locale) {
    if (date === "TBD") {
        return "TBD";
    }
    return new Intl.DateTimeFormat(locale, compactDateOptions).format(new Date(date));
}
export function dateRangeToString(start, end, locale) {
    if (start === "TBD" || end === "TBD") {
        return "TBD";
    }
    return new Intl.DateTimeFormat(locale, longDateOptions).formatRange(new Date(start), new Date(end));
}
export function dateRangeToCompactString(start, end, locale) {
    if (start === "TBD" || end === "TBD") {
        return "TBD";
    }
    return new Intl.DateTimeFormat(locale, compactDateOptions).formatRange(new Date(start), new Date(end));
}
export function toICal(e, includeDates = false) {
    if (e.date.start === "TBD" || e.date.end === "TBD") {
        return "";
    }
    const start = new Date(e.date.start);
    const end = new Date(e.date.end);
    const iCalEvent = ics.createEvents([
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
            : e.rounds.flatMap((round) => Object.entries(round.importantDates).flatMap(([type, date]) => {
                if (date === "TBD") {
                    return [];
                }
                const d = new Date(date);
                const readable = dateNameToReadable(type);
                const roundLabel = round.name ? `${round.name} – ` : "";
                return [
                    {
                        start: [
                            d.getFullYear(),
                            d.getMonth() + 1,
                            d.getDate(),
                        ],
                        end: [
                            d.getFullYear(),
                            d.getMonth() + 1,
                            d.getDate(),
                        ],
                        title: `${e.abbreviation}: ${roundLabel}${readable}`,
                        description: `${e.name}: ${roundLabel}${readable}`,
                        url: e.url,
                    },
                ];
            }))),
    ], {
        productId: "pl-conferences/ics",
        method: "PUBLISH",
    });
    if (iCalEvent.error) {
        throw new Error(iCalEvent.error.message);
    }
    return iCalEvent.value;
}
export function toGoogleCalendarLink(e) {
    function encodeDate(date) {
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
    if (e.location)
        url.searchParams.append("location", e.location);
    url.searchParams.append("sf", "true");
    url.searchParams.append("output", "xml");
    return url.toString();
}
//# sourceMappingURL=event.js.map