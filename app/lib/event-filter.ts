import { EventType, ScheduledEvent } from "./event";
import {
  isAfter as dateIsAfter,
  isBefore as dateIsBefore,
  getYear,
  isFuture,
} from "date-fns";
import { eventKey, PreferenceCollection } from "./user-prefs";

function hasDate(s: string): boolean {
  return s !== "TBD";
}

export type EventFilter = (event: ScheduledEvent) => boolean;

export const isActive: EventFilter = (e) =>
  hasDate(e.date.end) && dateIsAfter(e.date.end, new Date());

export const isType: (t: EventType) => EventFilter = (t) => (e) => e.type === t;

export const hasTag: (tag: string) => EventFilter = (tag) => (e) =>
  e.tags.includes(tag);

export const isAfter: (date: Date) => EventFilter = (date) => (e) =>
  hasDate(e.date.start) && dateIsAfter(e.date.start, date);

export const isBefore: (date: Date) => EventFilter = (date) => (e) =>
  hasDate(e.date.start) && dateIsBefore(e.date.start, date);

export const hasYear: (year: string) => EventFilter = (year) => (e) =>
  year === "" ||
  (hasDate(e.date.start) && getYear(e.date.start) === parseInt(year));

export const isCategory: (category: string) => EventFilter = (c) => (e) =>
  c === "" || e.type === c;

export const openToNewSubmissions: (enabled: boolean) => EventFilter =
  (on) => (e) => {
    if (!on) return true;
    const dates = Object.values(e.importantDates).sort();
    if (dates.length === 0) return false;
    return isFuture(dates[0]);
  };

export const hasFutureDeadline: EventFilter = (e) => {
  return Object.values(e.importantDates).some(isFuture);
};

export const hiddenFilter: (
  prefs: PreferenceCollection["eventPrefs"]
) => (opt: "all" | "hidden" | "visible") => EventFilter =
  (prefs) => (opt) => (e) =>
    opt === "all"
      ? true
      : opt === "hidden"
        ? prefs[eventKey(e)]?.hidden === true
        : prefs[eventKey(e)]?.hidden === undefined ||
          prefs[eventKey(e)].hidden === false;

export const isBetween: (range: { from?: Date; to?: Date }) => EventFilter =
  ({ from, to }) =>
  (e) =>
    hasDate(e.date.start) &&
    hasDate(e.date.end) &&
    from !== undefined &&
    dateIsAfter(e.date.start, from) &&
    to !== undefined &&
    dateIsBefore(e.date.start, to);

export function applyFilters(
  events: ScheduledEvent[],
  filters: EventFilter[]
): ScheduledEvent[] {
  return events.filter((e) => filters.every((f) => f(e)));
}

export const hasText: (text: string) => EventFilter = (text) => {
  const t = text.toLowerCase();
  return (e) =>
    t === "" ||
    e.name.toLowerCase().includes(t) ||
    e.abbreviation.toLowerCase().includes(t) ||
    e.location?.toLowerCase().includes(t) ||
    e.format?.toLowerCase().includes(t) ||
    e.tags.some((tag) => tag.toLowerCase().includes(t));
};
