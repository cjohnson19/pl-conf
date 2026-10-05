import {
  isAfter as dateIsAfter,
  isBefore as dateIsBefore,
  startOfDay,
} from "date-fns";
import { allDeadlines, isDeadlinePast } from "./event";
import type { MaybeDate, ScheduledEvent } from "./schemas";

export type EventFilter = (event: ScheduledEvent) => boolean;

function hasDate(s: MaybeDate): s is string {
  return s !== "TBD";
}

export const isActiveAt =
  (now: Date): EventFilter =>
  (e) =>
    hasDate(e.date.end) && dateIsAfter(e.date.end, now);

// The archive: events whose last day is behind us. Dates parse to local
// midnight, so this compares against the start of today — an event still
// running on its final day has not "already happened" and must not be filed
// under the archive. (`isActiveAt` drops it at that midnight, so on its closing
// day an event appears in neither view.) An end date of TBD is likewise neither
// active nor ended, mirroring `isActiveAt` treating it as unschedulable.
export const hasEndedAt =
  (now: Date): EventFilter =>
  (e) =>
    hasDate(e.date.end) && dateIsBefore(e.date.end, startOfDay(now));

// Submissions are open while no listed deadline has passed yet. A TBD-only
// schedule counts as open; a later round behind a passed one does not reopen it.
export const hasOpenSubmissionAt =
  (now: Date) =>
  (e: Pick<ScheduledEvent, "rounds">): boolean => {
    const dates = allDeadlines(e);
    return dates.length > 0 && dates.every((d) => !isDeadlinePast(d, now));
  };
