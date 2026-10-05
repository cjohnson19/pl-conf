import { allDeadlines, calendarDate, isDeadlinePast } from "./event";
import type { ScheduledEvent } from "./schemas";

export type EventFilter = (event: ScheduledEvent) => boolean;

const startOfDay = (now: Date) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate());

export const isActiveAt =
  (now: Date): EventFilter =>
  (e) =>
    e.date.end !== "TBD" && calendarDate(e.date.end).getTime() > now.getTime();

// The archive: events whose last day is behind us. Dates are local midnight,
// so this compares against the start of today — an event still running on its
// final day has not "already happened" and must not be filed under the
// archive. (`isActiveAt` drops it at that midnight, so on its closing day an
// event appears in neither view.) An end date of TBD is likewise neither
// active nor ended, mirroring `isActiveAt` treating it as unschedulable.
export const hasEndedAt =
  (now: Date): EventFilter =>
  (e) =>
    e.date.end !== "TBD" &&
    calendarDate(e.date.end).getTime() < startOfDay(now).getTime();

// Submissions are open while no listed deadline has passed yet. A TBD-only
// schedule counts as open; a later round behind a passed one does not reopen it.
export const hasOpenSubmissionAt =
  (now: Date) =>
  (e: Pick<ScheduledEvent, "rounds">): boolean => {
    const dates = allDeadlines(e);
    return dates.length > 0 && dates.every((d) => !isDeadlinePast(d, now));
  };
