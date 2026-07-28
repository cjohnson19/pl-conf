import {
  isAfter as dateIsAfter,
  isBefore as dateIsBefore,
  startOfDay,
} from "date-fns";
import { allDeadlines, firstDeadline, isDeadlinePast } from "./event";
import type { EventType, MaybeDate, ScheduledEvent, Tag } from "./schemas";

export type EventFilter = (event: ScheduledEvent) => boolean;

export function hasDate(s: MaybeDate): s is string {
  return s !== "TBD";
}

export const isActiveAt =
  (now: Date): EventFilter =>
  (e) =>
    hasDate(e.date.end) && dateIsAfter(e.date.end, now);

export const isActive: EventFilter = (e) => isActiveAt(new Date())(e);

// The archive: events whose last day is behind us. Dates parse to local
// midnight, so this compares against the start of today — an event still
// running on its final day has not "already happened" and must not be filed
// under the archive. (`isActiveAt` drops it at that midnight, so on its closing
// day an event appears in neither view.) An end date of TBD is likewise neither
// active nor ended, mirroring `isActive` treating it as unschedulable.
export const hasEndedAt =
  (now: Date): EventFilter =>
  (e) =>
    hasDate(e.date.end) && dateIsBefore(e.date.end, startOfDay(now));

export const hasEnded: EventFilter = (e) => hasEndedAt(new Date())(e);

export const isType: (t: EventType) => EventFilter = (t) => (e) => e.type === t;

export const hasTag: (tag: Tag) => EventFilter = (tag) => (e) =>
  e.tags.includes(tag);

export const startsAfter: (date: Date) => EventFilter = (date) => (e) =>
  hasDate(e.date.start) && dateIsAfter(e.date.start, date);

export const startsBefore: (date: Date) => EventFilter = (date) => (e) =>
  hasDate(e.date.start) && dateIsBefore(e.date.start, date);

export const hasYear: (year: number) => EventFilter = (year) => (e) =>
  e.year === year;

export const hasFutureDeadline: EventFilter = (e) =>
  allDeadlines(e).some((d) => !isDeadlinePast(d));

export const hasFutureDeadlineAt =
  (now: Date): EventFilter =>
  (e) =>
    allDeadlines(e).some((d) => !isDeadlinePast(d, now));

export const hasOpenSubmission: EventFilter = (e) => {
  const first = firstDeadline(e);
  if (first === undefined) return false;
  return !isDeadlinePast(first);
};

export const hasOpenSubmissionAt =
  (now: Date): EventFilter =>
  (e) => {
    const first = firstDeadline(e);
    if (first === undefined) return false;
    return !isDeadlinePast(first, now);
  };

export const startsBetween: (range: { from?: Date; to?: Date }) => EventFilter =
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
