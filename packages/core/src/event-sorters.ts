import { compareAsc, compareDesc } from "date-fns";
import { ScheduledEvent } from "./event.js";

export type EventSorter = (a: ScheduledEvent, b: ScheduledEvent) => number;

export function sortWith<T>(l: T[], fns: ((a: T, b: T) => number)[]): T[] {
  return l.toSorted((a, b) => fns.reduce((p, f) => (p === 0 ? f(a, b) : p), 0));
}

export function sortByFirstDeadline(
  a: ScheduledEvent,
  b: ScheduledEvent
): number {
  const aDate = Object.values(a.importantDates).sort()[0];
  const bDate = Object.values(b.importantDates).sort()[0];
  if (aDate === undefined && bDate === undefined) return 0;
  if (aDate === undefined) return 1;
  if (bDate === undefined) return -1;
  return compareAsc(aDate, bDate);
}

export function sortByEventDate(a: ScheduledEvent, b: ScheduledEvent): number {
  return compareAsc(a.date.start, b.date.start);
}

export function sortByLastUpdated(
  a: ScheduledEvent,
  b: ScheduledEvent
): number {
  return compareDesc(a.lastUpdated, b.lastUpdated);
}

export function compose(s1: EventSorter, s2: EventSorter): EventSorter {
  return (a, b) => {
    const r1 = s1(a, b);
    return r1 === 0 ? s2(a, b) : r1;
  };
}
