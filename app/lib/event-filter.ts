import { eventKey, EventType } from "@pl-conf/core";
import {
  isActive,
  isType as coreIsType,
  hasYear as coreHasYear,
  hasOpenSubmission,
  EventFilter,
  hasDate,
  hasTag,
  startsAfter,
  startsBefore,
  hasFutureDeadline,
  startsBetween,
  matchesText,
  applyFilters,
} from "@pl-conf/core";
import { PreferenceCollection } from "./user-prefs";

export type { EventFilter };
export {
  isActive,
  hasDate,
  hasTag,
  startsAfter,
  startsBefore,
  hasFutureDeadline,
  startsBetween,
  matchesText,
  applyFilters,
};

export const isCategory: (category: string) => EventFilter = (c) =>
  c === "" ? () => true : coreIsType(c as EventType);

export const hasYear: (year: string) => EventFilter = (year) =>
  year === "" ? () => true : coreHasYear(parseInt(year));

export const openToNewSubmissions: (enabled: boolean) => EventFilter =
  (on) => (e) => (on ? hasOpenSubmission(e) : true);

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

// Backwards-compatible alias
export const hasText = matchesText;
export const isAfter = startsAfter;
export const isBefore = startsBefore;
export const isBetween = startsBetween;
