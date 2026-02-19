import {
  isAfter as dateIsAfter,
  isBefore as dateIsBefore,
  getYear,
  isFuture,
  isToday,
} from "date-fns";
import { EventType, MaybeDate, ScheduledEvent } from "./event.js";

export type EventFilter = (event: ScheduledEvent) => boolean;

export function hasDate(s: MaybeDate): s is string {
  return s !== "TBD";
}

export const isActive: EventFilter = (e) =>
  hasDate(e.date.end) && dateIsAfter(e.date.end, new Date());

export const isType: (t: EventType) => EventFilter = (t) => (e) => e.type === t;

export const hasTag: (tag: string) => EventFilter = (tag) => (e) =>
  e.tags.includes(tag);

export const startsAfter: (date: Date) => EventFilter = (date) => (e) =>
  hasDate(e.date.start) && dateIsAfter(e.date.start, date);

export const startsBefore: (date: Date) => EventFilter = (date) => (e) =>
  hasDate(e.date.start) && dateIsBefore(e.date.start, date);

export const hasYear: (year: number) => EventFilter = (year) => (e) =>
  hasDate(e.date.start) && getYear(e.date.start) === year;

export const hasFutureDeadline: EventFilter = (e) =>
  Object.values(e.importantDates).some(isFuture);

export const hasOpenSubmission: EventFilter = (e) => {
  const dates = Object.values(e.importantDates).sort();
  if (dates.length === 0) return false;
  return isFuture(dates[0]) || isToday(dates[0]);
};

export const startsBetween: (range: {
  from?: Date;
  to?: Date;
}) => EventFilter =
  ({ from, to }) =>
  (e) =>
    hasDate(e.date.start) &&
    hasDate(e.date.end) &&
    from !== undefined &&
    dateIsAfter(e.date.start, from) &&
    to !== undefined &&
    dateIsBefore(e.date.start, to);

export const matchesText: (text: string) => EventFilter = (text) => {
  const t = text.toLowerCase().trim();
  return (e) =>
    t === "" ||
    e.name.toLowerCase().includes(t) ||
    e.abbreviation.toLowerCase().includes(t) ||
    e.location?.toLowerCase().includes(t) ||
    e.format?.toLowerCase().includes(t) ||
    e.tags.some((tag) => tag.toLowerCase().includes(t));
};

export function applyFilters(
  events: ScheduledEvent[],
  filters: EventFilter[]
): ScheduledEvent[] {
  return events.filter((e) => filters.every((f) => f(e)));
}
