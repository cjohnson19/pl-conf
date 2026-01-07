import { format, isBefore, isSameMonth, isSameYear, isSameDay } from "date-fns";
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
// Full event schema used by the website
export const ScheduledEvent = z
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
    notes: z.string().array().default([]),
    type: EventType,
    tags: z.array(z.string()).default([]),
    lastUpdated: DateSchema,
})
    .strict()
    .refine((data) => Object.keys(data.importantDates).length === 0 || data.importantDateUrl, {
    message: "A reference url must be provided if there are important dates",
    path: ["importantDateUrl", "importantDates"],
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
// Submission schema used by the lambda (subset of ScheduledEvent)
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
    importantDates: z.record(DateName, z.union([TBD, DateSchema])).default({}),
    notes: z.string().array().default([]),
    type: EventType,
})
    .strict();
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
export function dateToString(date) {
    if (date === "TBD") {
        return "TBD";
    }
    return format(date, "PPP");
}
export function dateRangeToString(start, end) {
    // Handle TBD cases
    if (start === "TBD" || end === "TBD") {
        return "TBD";
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    // Single day event
    if (isSameDay(startDate, endDate)) {
        return format(startDate, "MMMM do, yyyy");
    }
    // Same month and year
    if (isSameMonth(startDate, endDate) && isSameYear(startDate, endDate)) {
        return `${format(startDate, "MMMM do")}–${format(endDate, "do, yyyy")}`;
    }
    // Same year but different months
    if (isSameYear(startDate, endDate)) {
        return `${format(startDate, "MMMM do")} – ${format(endDate, "MMMM do, yyyy")}`;
    }
    // Different years
    return `${format(startDate, "MMMM do, yyyy")} – ${format(endDate, "MMMM do, yyyy")}`;
}
export function dateRangeToCompactString(start, end) {
    // Handle TBD cases
    if (start === "TBD" || end === "TBD") {
        return "TBD";
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    // Single day event
    if (isSameDay(startDate, endDate)) {
        return format(startDate, "M/d/yy");
    }
    // Same month and year
    if (isSameMonth(startDate, endDate) && isSameYear(startDate, endDate)) {
        return `${format(startDate, "M/d")} – ${format(endDate, "M/d/yy")}`;
    }
    // Same year but different months
    if (isSameYear(startDate, endDate)) {
        return `${format(startDate, "M/d")} – ${format(endDate, "M/d/yy")}`;
    }
    // Different years
    return `${format(startDate, "M/d/yy")} – ${format(endDate, "M/d/yy")}`;
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
                        ],
                        end: [
                            d.getFullYear(),
                            d.getMonth() + 1,
                            d.getDate(),
                        ],
                        title: `${e.abbreviation}: ${dateNameToReadable(type)}`,
                        description: `${e.name}: ${dateNameToReadable(type)}`,
                        url: e.url,
                    },
                ];
            })),
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