import { EventType, ScheduledEvent } from "./event";
import { DateRange } from "react-day-picker";
import { isAfter as dateIsAfter, isBefore as dateIsBefore } from "date-fns";

function hasDate(s: string): boolean {
  return s !== "TBD";
}

export interface EventFilter {
  f: (event: ScheduledEvent) => boolean;
}

export const isType: (t: EventType) => EventFilter = (t) => ({
  f: (e) => e.type === t,
});

export const hasTag: (tag: string) => EventFilter = (tag) => ({
  f: (e) => e.tags.includes(tag),
});

export const isAfter: (date: Date) => EventFilter = (date) => {
  return {
    f: (e) => hasDate(e.date.start) && dateIsAfter(e.date.start, date),
  };
};

export const isBefore: (date: Date) => EventFilter = (date) => {
  return {
    f: (e) => hasDate(e.date.start) && dateIsBefore(e.date.start, date),
  };
};

export const isBetween: (range: DateRange) => EventFilter = ({ from, to }) => {
  return {
    f: (e) =>
      hasDate(e.date.start) &&
      hasDate(e.date.end) &&
      from !== undefined &&
      dateIsAfter(e.date.start, from) &&
      to !== undefined &&
      dateIsBefore(e.date.start, to),
  };
};

export function applyFilters(
  events: ScheduledEvent[],
  filters: EventFilter[],
): ScheduledEvent[] {
  return events.filter((e) => filters.every((filter) => filter.f(e)));
}

export const hasText: (text: string) => EventFilter = (text) => {
  const t = text.toLowerCase();
  return {
    f: (e) =>
      e.name.toLowerCase().includes(t) ||
      e.abbreviation.toLowerCase().includes(t) ||
      e.location?.toLowerCase().includes(t) ||
      e.format?.toLowerCase().includes(t) ||
      e.tags.some((tag) => tag.toLowerCase().includes(t)),
  };
};
