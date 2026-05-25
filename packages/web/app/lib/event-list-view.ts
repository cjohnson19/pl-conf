import {
  type DateName,
  type ScheduledEvent,
  type Tag,
  eventKey,
  tagValues,
} from "./event";
import {
  findAllUpcomingDeadlines,
  findNextDeadline,
  findNextStart,
  isDueThisWeek,
} from "./deadline";
import { applyFilters, isActive, openToNewSubmissions } from "./event-filter";
import type { Category, FilterParams } from "./filter-params";
import { type Group, buildGroups } from "../components/event-list/grouping";

export type ViewCounts = {
  starred: number | null;
  all: number;
  submissions: number;
};

export type HeroEvent = {
  key: string;
  abbreviation: string;
  type: ScheduledEvent["type"];
  location?: string;
  // All deadlines future-at-SSR, sorted ascending. Hero picks the first one
  // still future as of live `now`, so as the user keeps the tab open and a
  // round elapses, the alert rolls to the next round instead of disappearing.
  upcomingDeadlines: { name: DateName; date: string; time: number }[];
  upcomingStart?: { date: string; time: number };
};

// Projection of ScheduledEvent shipped to client components via RSC. Drops
// fields no client consumer reads (submissionUrl, notes), fields used only
// for server aggregation (lastUpdated), and fields only needed by the
// server-rendered .ics path (sequence).
export type DisplayEvent = Omit<
  ScheduledEvent,
  "submissionUrl" | "notes" | "lastUpdated" | "sequence"
>;

export function toDisplayEvent(e: ScheduledEvent): DisplayEvent {
  return {
    name: e.name,
    abbreviation: e.abbreviation,
    type: e.type,
    date: e.date,
    location: e.location,
    importantDateUrl: e.importantDateUrl,
    format: e.format,
    url: e.url,
    rounds: e.rounds,
    tags: e.tags,
    partOf: e.partOf,
    colocatedWith: e.colocatedWith,
  };
}

// Slim projection of `activeEvents` shipped to the client so chip/tab/footer
// counts can be re-derived after subtracting hidden events. `hasOpenSubmission`
// and `dueThisWeek` are computed once at SSR — they don't tick — but that's
// the same approximation the SSR counts already make.
export type CountableEvent = {
  key: string;
  category: Category;
  tags: Tag[];
  hasOpenSubmission: boolean;
  dueThisWeek: boolean;
};

export type EventListView = {
  activeEvents: ScheduledEvent[];
  displayEvents: DisplayEvent[];
  heroEvents: HeroEvent[];
  groups: Group[];
  countableActive: CountableEvent[];
  categoryCounts: Record<Category, number>;
  tagCounts: Record<Tag, number>;
  viewCounts: ViewCounts;
  dueThisWeek: number;
  totalActive: number;
  lastUpdatedDate: string | undefined;
};

export function buildHeroEvents(
  events: ScheduledEvent[],
  now: Date
): HeroEvent[] {
  return events.flatMap((e) => {
    const deadlines = findAllUpcomingDeadlines(e, now);
    const start = findNextStart(e, now);
    if (deadlines.length === 0 && !start) return [];
    return [
      {
        key: eventKey(e),
        abbreviation: e.abbreviation,
        type: e.type,
        location: e.location,
        upcomingDeadlines: deadlines.map((d) => ({
          name: d.name,
          date: d.date,
          time: d.time,
        })),
        upcomingStart: start ?? undefined,
      },
    ];
  });
}

type ComputeOptions = {
  starredKeys?: Set<string>;
};

export function buildSearchHaystack(e: DisplayEvent): string {
  const parts = [e.name, e.abbreviation];
  if (e.location) parts.push(e.location);
  if (e.format) parts.push(e.format);
  parts.push(...e.tags);
  return parts.join("\n").toLowerCase();
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

  const preTagFiltered = applyFilters(activeEvents, [
    (e) => (filters.category === "all" ? true : e.type === filters.category),
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

  const decorated = baseFiltered.map((e) => ({
    e,
    time: findNextDeadline(e, now)?.time,
  }));
  decorated.sort((a, b) => {
    if (a.time !== undefined && b.time !== undefined) return a.time - b.time;
    if (a.time !== undefined) return -1;
    if (b.time !== undefined) return 1;
    return a.e.abbreviation.localeCompare(b.e.abbreviation);
  });
  const displayEvents = decorated.map((d) => toDisplayEvent(d.e));

  const groups = buildGroups(displayEvents, now);
  const dueThisWeek = displayEvents.filter((e) => isDueThisWeek(e, now)).length;

  const lastUpdatedDates = events
    .map((e) => e.lastUpdated)
    .filter((d): d is string => typeof d === "string");
  const lastUpdatedDate =
    lastUpdatedDates.length === 0
      ? undefined
      : lastUpdatedDates.reduce((max, d) => (d > max ? d : max));

  const countableActive: CountableEvent[] = activeEvents.map((e) => ({
    key: eventKey(e),
    category: e.type,
    tags: [...e.tags],
    hasOpenSubmission: hasOpenSubmission(e),
    dueThisWeek: isDueThisWeek(e, now),
  }));

  return {
    activeEvents,
    displayEvents,
    heroEvents: buildHeroEvents(activeEvents, now),
    groups,
    countableActive,
    categoryCounts,
    tagCounts,
    viewCounts,
    dueThisWeek,
    totalActive: activeEvents.length,
    lastUpdatedDate,
  };
}
