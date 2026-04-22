import { isAfter as dateIsAfter, isBefore as dateIsBefore, getYear, isFuture, isToday, } from "date-fns";
import { allDeadlines, firstDeadline, } from "./event.js";
export function hasDate(s) {
    return s !== "TBD";
}
export const isActive = (e) => hasDate(e.date.end) && dateIsAfter(e.date.end, new Date());
export const isType = (t) => (e) => e.type === t;
export const hasTag = (tag) => (e) => e.tags.includes(tag);
export const startsAfter = (date) => (e) => hasDate(e.date.start) && dateIsAfter(e.date.start, date);
export const startsBefore = (date) => (e) => hasDate(e.date.start) && dateIsBefore(e.date.start, date);
export const hasYear = (year) => (e) => hasDate(e.date.start) && getYear(e.date.start) === year;
export const hasFutureDeadline = (e) => allDeadlines(e).some(isFuture);
export const hasOpenSubmission = (e) => {
    const first = firstDeadline(e);
    if (first === undefined)
        return false;
    return isFuture(first) || isToday(first);
};
export const startsBetween = ({ from, to }) => (e) => hasDate(e.date.start) &&
    hasDate(e.date.end) &&
    from !== undefined &&
    dateIsAfter(e.date.start, from) &&
    to !== undefined &&
    dateIsBefore(e.date.start, to);
export const matchesText = (text) => {
    const t = text.toLowerCase().trim();
    return (e) => t === "" ||
        e.name.toLowerCase().includes(t) ||
        e.abbreviation.toLowerCase().includes(t) ||
        e.location?.toLowerCase().includes(t) ||
        e.format?.toLowerCase().includes(t) ||
        e.tags.some((tag) => tag.toLowerCase().includes(t));
};
export function applyFilters(events, filters) {
    return events.filter((e) => filters.every((f) => f(e)));
}
//# sourceMappingURL=event-filters.js.map