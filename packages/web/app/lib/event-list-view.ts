import { type ScheduledEvent, type Tag, eventKey, tagValues } from "./event";
import { findNextDeadline, isDueThisWeek } from "./deadline";
import { applyFilters, isActive, openToNewSubmissions } from "./event-filter";
import type { Category, FilterParams } from "./filter-params";
import { type Group, buildGroups } from "../components/event-list/grouping";

export type ViewCounts = {
  starred: number | null;
  all: number;
  submissions: number;
};

export type EventListView = {
  activeEvents: ScheduledEvent[];
  displayEvents: ScheduledEvent[];
  groups: Group[];
  categoryCounts: Record<Category, number>;
  tagCounts: Record<Tag, number>;
  viewCounts: ViewCounts;
  dueThisWeek: number;
  totalActive: number;
  lastUpdatedDate: string | undefined;
};

type ComputeOptions = {
  starredKeys?: Set<string>;
};

export function buildSearchHaystacks(
  events: ScheduledEvent[]
): Map<string, string> {
  const m = new Map<string, string>();
  events.forEach((e) => {
    const parts = [e.name, e.abbreviation];
    if (e.location) parts.push(e.location);
    if (e.format) parts.push(e.format);
    parts.push(...e.tags);
    m.set(eventKey(e), parts.join("\n").toLowerCase());
  });
  return m;
}

export function computeEventListView(
  events: ScheduledEvent[],
  filters: FilterParams,
  now: Date,
  options: ComputeOptions = {}
): EventListView {
  const { starredKeys } = options;
  const hasOpenSubmission = openToNewSubmissions(true, now);

  const activeEvents = applyFilters(events, [isActive]);

  const categoryCounts: Record<Category, number> = {
    all: activeEvents.length,
    conference: 0,
    workshop: 0,
    symposium: 0,
    school: 0,
  };
  activeEvents.forEach((e) => {
    categoryCounts[e.type] = (categoryCounts[e.type] ?? 0) + 1;
  });

  const haystacks = buildSearchHaystacks(activeEvents);
  const needle = filters.q.trim().toLowerCase();
  const matchesSearch: (e: ScheduledEvent) => boolean =
    needle === ""
      ? () => true
      : (e) => (haystacks.get(eventKey(e)) ?? "").includes(needle);

  const preTagFiltered = applyFilters(activeEvents, [
    (e) => (filters.category === "all" ? true : e.type === filters.category),
    matchesSearch,
  ]);

  const tagCounts = Object.fromEntries(tagValues.map((t) => [t, 0])) as Record<
    Tag,
    number
  >;
  preTagFiltered.forEach((e) => {
    e.tags.forEach((t) => {
      tagCounts[t] += 1;
    });
  });

  const baseFiltered =
    filters.tags.size === 0
      ? preTagFiltered
      : preTagFiltered.filter((e) => e.tags.some((t) => filters.tags.has(t)));

  const viewCounts: ViewCounts = {
    starred: starredKeys
      ? baseFiltered.filter((e) => starredKeys.has(eventKey(e))).length
      : null,
    all: baseFiltered.length,
    submissions: baseFiltered.filter(hasOpenSubmission).length,
  };

  const viewFiltered = baseFiltered.filter((e) => {
    if (filters.view === "starred")
      return starredKeys ? starredKeys.has(eventKey(e)) : true;
    if (filters.view === "submissions") return hasOpenSubmission(e);
    return true;
  });

  const decorated = viewFiltered.map((e) => ({
    e,
    time: findNextDeadline(e, now)?.time,
  }));
  decorated.sort((a, b) => {
    if (a.time !== undefined && b.time !== undefined) return a.time - b.time;
    if (a.time !== undefined) return -1;
    if (b.time !== undefined) return 1;
    return a.e.abbreviation.localeCompare(b.e.abbreviation);
  });
  const displayEvents = decorated.map((d) => d.e);

  const groups = buildGroups(displayEvents, now);
  const dueThisWeek = displayEvents.filter((e) => isDueThisWeek(e, now)).length;

  const lastUpdatedDates = events
    .map((e) => e.lastUpdated)
    .filter((d): d is string => typeof d === "string");
  const lastUpdatedDate =
    lastUpdatedDates.length === 0
      ? undefined
      : lastUpdatedDates.reduce((max, d) => (d > max ? d : max));

  return {
    activeEvents,
    displayEvents,
    groups,
    categoryCounts,
    tagCounts,
    viewCounts,
    dueThisWeek,
    totalActive: activeEvents.length,
    lastUpdatedDate,
  };
}
