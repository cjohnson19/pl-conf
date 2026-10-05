import {
  hasEndedAt,
  hasOpenSubmissionAt,
  isActiveAt,
  type ScheduledEvent,
  type Tag,
  tagValues,
} from "./event";
import { isDueThisWeek } from "./deadline";
import type { Category, FilterParams } from "./filter-params";

export type Counts = {
  categoryCounts: Record<Category, number>;
  tagCounts: Record<Tag, number>;
  viewCounts: { all: number; submissions: number; archive: number };
  dueThisWeek: number;
  totalActive: number;
};

// The category chips and tag filter as a predicate.
export const matchesChips =
  ({ category, tags }: FilterParams) =>
  (e: Pick<ScheduledEvent, "type" | "tags">): boolean =>
    (category === "all" || e.type === category) &&
    (tags.size === 0 || e.tags.some((t) => tags.has(t)));

const tally = <K extends string>(keys: readonly K[], items: K[]) =>
  items.reduce(
    (acc, k) => {
      acc[k] += 1;
      return acc;
    },
    Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>
  );

// The chips and tag counts describe whichever pool the list is showing
// (archive vs live), while the view tabs always report on both. The starred
// tab is counted on the client, where the starred set lives.
export function computeCounts(
  events: ScheduledEvent[],
  filters: FilterParams,
  now: Date
): Counts {
  const active = events.filter(isActiveAt(now));
  const archived = events.filter(hasEndedAt(now));
  const listed = filters.view === "archive" ? archived : active;
  const byCategory = listed.filter(
    matchesChips({ ...filters, tags: new Set() })
  );
  const activeFiltered = active.filter(matchesChips(filters));

  return {
    categoryCounts: {
      ...tally(
        ["conference", "workshop", "symposium"] as const,
        listed.map((e) => e.type)
      ),
      all: listed.length,
    },
    tagCounts: tally(
      tagValues,
      byCategory.flatMap((e) => e.tags)
    ),
    viewCounts: {
      all: activeFiltered.length,
      submissions: activeFiltered.filter(hasOpenSubmissionAt(now)).length,
      archive: archived.filter(matchesChips(filters)).length,
    },
    dueThisWeek: activeFiltered.filter((e) => isDueThisWeek(e, now)).length,
    totalActive: active.length,
  };
}
