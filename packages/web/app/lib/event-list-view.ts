import {
  type DateName,
  type ScheduledEvent,
  type Tag,
  eventKey,
  eventPathFromSlug,
  eventSlug,
  tagValues,
  toCalendarDate,
} from "./event";
import {
  findAllUpcomingDeadlines,
  findNextDeadline,
  findNextStart,
  isDueThisWeek,
} from "./deadline";
import { hasEndedAt, isActiveAt, openToNewSubmissions } from "./event-filter";
import type { Category, FilterParams } from "./filter-params";
import {
  type Group,
  buildArchiveGroups,
  buildGroups,
} from "../components/event-list/grouping";

export type ViewCounts = {
  starred: number | null;
  all: number;
  submissions: number;
  archive: number;
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

// A partOf/colocatedWith reference paired with the dedicated-page path it
// resolves to. `path` is set only when a same-year event with that abbreviation
// actually exists (i.e. has a page), so the UI can link real targets and leave
// the rest as plain text instead of producing dead links.
export type RelatedLink = { abbreviation: string; path?: string };

// Projection of ScheduledEvent shipped to client components via RSC. Drops
// fields no client consumer reads (submissionUrl, notes), fields used only
// for server aggregation (lastUpdated), and fields only needed by the
// server-rendered .ics path (sequence). The raw partOf/colocatedWith arrays
// are dropped too — clients read the resolved *Links instead.
export type DisplayEvent = Omit<
  ScheduledEvent,
  | "submissionUrl"
  | "notes"
  | "lastUpdated"
  | "sequence"
  | "partOf"
  | "colocatedWith"
> & {
  partOfLinks: RelatedLink[];
  colocatedLinks: RelatedLink[];
};

function toRelatedLinks(
  abbrevs: string[],
  year: number,
  validEventPaths?: Set<string>
): RelatedLink[] {
  return abbrevs.map((abbreviation) => {
    const path = eventPathFromSlug(year, eventSlug(abbreviation));
    return validEventPaths?.has(path)
      ? { abbreviation, path }
      : { abbreviation };
  });
}

export function toDisplayEvent(
  e: ScheduledEvent,
  validEventPaths?: Set<string>
): DisplayEvent {
  const year = e.year;
  return {
    name: e.name,
    abbreviation: e.abbreviation,
    type: e.type,
    year,
    date: e.date,
    location: e.location,
    importantDateUrl: e.importantDateUrl,
    format: e.format,
    url: e.url,
    rounds: e.rounds,
    tags: e.tags,
    partOfLinks: toRelatedLinks(e.partOf, year, validEventPaths),
    colocatedLinks: toRelatedLinks(e.colocatedWith, year, validEventPaths),
  };
}

// Slim projection of every event — active and archived — shipped to the client
// so chip/tab/footer counts can be re-derived after subtracting hidden events.
// `hasOpenSubmission` and `dueThisWeek` are computed once at SSR — they don't
// tick — but that's the same approximation the SSR counts already make.
export type CountableEvent = {
  key: string;
  category: Category;
  tags: Tag[];
  hasOpenSubmission: boolean;
  dueThisWeek: boolean;
  archived: boolean;
};

export type EventListView = {
  activeEvents: ScheduledEvent[];
  archivedEvents: ScheduledEvent[];
  // True when the archive view is active: `displayEvents` and `groups` then
  // describe finished events instead of the live list.
  isArchive: boolean;
  displayEvents: DisplayEvent[];
  heroEvents: HeroEvent[];
  groups: Group[];
  countableEvents: CountableEvent[];
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
  validEventPaths?: Set<string>;
};

export function buildSearchHaystack(e: DisplayEvent): string {
  const parts = [e.name, e.abbreviation];
  if (e.location) parts.push(e.location);
  if (e.format) parts.push(e.format);
  parts.push(...e.tags);
  return parts.join("\n").toLowerCase();
}

// Most recently held first, so the top of the archive is the conference that
// just wrapped up. Sorting and grouping both key off the *start* date, which
// keeps month groups contiguous even for events that straddle a month boundary;
// within a month that can put a long event above a short one that ended later.
function sortArchived(events: ScheduledEvent[]): ScheduledEvent[] {
  return [...events].sort((a, b) => {
    const at = startTime(a);
    const bt = startTime(b);
    if (at !== bt) return bt - at;
    return a.abbreviation.localeCompare(b.abbreviation);
  });
}

function startTime(e: ScheduledEvent): number {
  const cal = e.date.start === "TBD" ? null : toCalendarDate(e.date.start);
  return cal ? cal.getTime() : Number.NEGATIVE_INFINITY;
}

function sortByNextDeadline(
  events: ScheduledEvent[],
  now: Date
): ScheduledEvent[] {
  const decorated = events.map((e) => ({
    e,
    time: findNextDeadline(e, now)?.time,
  }));
  decorated.sort((a, b) => {
    if (a.time !== undefined && b.time !== undefined) return a.time - b.time;
    if (a.time !== undefined) return -1;
    if (b.time !== undefined) return 1;
    return a.e.abbreviation.localeCompare(b.e.abbreviation);
  });
  return decorated.map((d) => d.e);
}

export function computeEventListView(
  events: ScheduledEvent[],
  filters: FilterParams,
  now: Date,
  options: ComputeOptions = {}
): EventListView {
  const { starredKeys, validEventPaths } = options;
  const hasOpenSubmission = openToNewSubmissions(true, now);
  const isArchive = filters.view === "archive";

  const activeEvents = events.filter(isActiveAt(now));
  const archivedEvents = events.filter(hasEndedAt(now));
  // The archive view swaps which pool the list, the chips, and the tag counts
  // describe; the tab counts always report on both.
  const listed = isArchive ? archivedEvents : activeEvents;

  const categoryCounts: Record<Category, number> = {
    all: listed.length,
    conference: 0,
    workshop: 0,
    symposium: 0,
    school: 0,
  };
  listed.forEach((e) => {
    categoryCounts[e.type] = (categoryCounts[e.type] ?? 0) + 1;
  });

  const byCategory = (list: ScheduledEvent[]) =>
    filters.category === "all"
      ? list
      : list.filter((e) => e.type === filters.category);
  const byTags = (list: ScheduledEvent[]) =>
    filters.tags.size === 0
      ? list
      : list.filter((e) => e.tags.some((t) => filters.tags.has(t)));

  const preTagFiltered = byCategory(listed);

  const tagCounts = Object.fromEntries(tagValues.map((t) => [t, 0])) as Record<
    Tag,
    number
  >;
  preTagFiltered.forEach((e) => {
    e.tags.forEach((t) => {
      tagCounts[t] += 1;
    });
  });

  const baseFiltered = byTags(preTagFiltered);
  const activeFiltered = isArchive
    ? byTags(byCategory(activeEvents))
    : baseFiltered;
  const archivedFiltered = isArchive
    ? baseFiltered
    : byTags(byCategory(archivedEvents));

  const viewCounts: ViewCounts = {
    starred: starredKeys
      ? activeFiltered.filter((e) => starredKeys.has(eventKey(e))).length
      : null,
    all: activeFiltered.length,
    submissions: activeFiltered.filter(hasOpenSubmission).length,
    archive: archivedFiltered.length,
  };

  const sorted = isArchive
    ? sortArchived(baseFiltered)
    : sortByNextDeadline(baseFiltered, now);
  const displayEvents = sorted.map((e) => toDisplayEvent(e, validEventPaths));

  const groups = isArchive
    ? buildArchiveGroups(displayEvents)
    : buildGroups(displayEvents, now);
  const dueThisWeek = activeFiltered.filter((e) =>
    isDueThisWeek(e, now)
  ).length;

  const lastUpdatedDates = events
    .map((e) => e.lastUpdated)
    .filter((d): d is string => typeof d === "string");
  const lastUpdatedDate =
    lastUpdatedDates.length === 0
      ? undefined
      : lastUpdatedDates.reduce((max, d) => (d > max ? d : max));

  const toCountable = (
    e: ScheduledEvent,
    archived: boolean
  ): CountableEvent => ({
    key: eventKey(e),
    category: e.type,
    tags: [...e.tags],
    hasOpenSubmission: !archived && hasOpenSubmission(e),
    dueThisWeek: !archived && isDueThisWeek(e, now),
    archived,
  });
  const countableEvents: CountableEvent[] = [
    ...activeEvents.map((e) => toCountable(e, false)),
    ...archivedEvents.map((e) => toCountable(e, true)),
  ];

  return {
    activeEvents,
    archivedEvents,
    isArchive,
    displayEvents,
    heroEvents: buildHeroEvents(activeEvents, now),
    groups,
    countableEvents,
    categoryCounts,
    tagCounts,
    viewCounts,
    dueThisWeek,
    totalActive: activeEvents.length,
    lastUpdatedDate,
  };
}
