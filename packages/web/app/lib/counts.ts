import { type Tag, tagValues } from "./event";
import type { CountableEvent } from "./event-list-view";
import type { Category, View } from "./filter-params";

export type ViewCounts = {
  starred: number | null;
  all: number;
  submissions: number;
  archive: number;
};

export type Counts = {
  categoryCounts: Record<Category, number>;
  tagCounts: Record<Tag, number>;
  viewCounts: ViewCounts;
  dueThisWeek: number;
  totalActive: number;
};

export type CountsInput = {
  category: Category;
  tags: Set<Tag>;
  view: View;
  starredKeys: Set<string>;
  // Until prefs hydrate the starred count is unknown; `starred: null`
  // suppresses the badge instead of showing a misleading 0.
  starredLoaded: boolean;
};

// The chips and tag counts describe whichever pool the list is showing
// (archive vs live), while the view tabs always report on both.
export function computeCounts(
  events: CountableEvent[],
  { category, tags, view, starredKeys, starredLoaded }: CountsInput
): Counts {
  const active = events.filter((e) => !e.archived);
  const archived = events.filter((e) => e.archived);
  const listed = view === "archive" ? archived : active;

  const categoryCounts: Record<Category, number> = {
    all: listed.length,
    conference: 0,
    workshop: 0,
    symposium: 0,
  };
  listed.forEach((e) => {
    categoryCounts[e.category] += 1;
  });

  const byChips = (list: CountableEvent[]) =>
    list
      .filter((e) => category === "all" || e.category === category)
      .filter((e) => tags.size === 0 || e.tags.some((t) => tags.has(t)));

  const preTagFiltered =
    category === "all" ? listed : listed.filter((e) => e.category === category);
  const tagCounts = Object.fromEntries(tagValues.map((t) => [t, 0])) as Record<
    Tag,
    number
  >;
  preTagFiltered.forEach((e) => {
    e.tags.forEach((t) => {
      tagCounts[t] += 1;
    });
  });

  const activeFiltered = byChips(active);

  const viewCounts: ViewCounts = {
    starred: starredLoaded
      ? activeFiltered.filter((e) => starredKeys.has(e.key)).length
      : null,
    all: activeFiltered.length,
    submissions: activeFiltered.filter((e) => e.hasOpenSubmission).length,
    archive: byChips(archived).length,
  };

  return {
    categoryCounts,
    tagCounts,
    viewCounts,
    dueThisWeek: activeFiltered.filter((e) => e.dueThisWeek).length,
    totalActive: active.length,
  };
}
