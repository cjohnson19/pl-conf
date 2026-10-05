import {
  type DateName,
  type ScheduledEvent,
  eventKey,
  eventPathFromSlug,
  eventSlug,
  hasEndedAt,
  hasOpenSubmissionAt,
  isActiveAt,
  toCalendarDate,
} from "./event";
import { type Counts, computeCounts, matchesChips } from "./counts";
import {
  deadlineStanding,
  findAllUpcomingDeadlines,
  findNextStart,
} from "./deadline";
import type { FilterParams } from "./filter-params";
import type { ListRow } from "./list-visibility";
import {
  type Group,
  buildArchiveGroups,
  buildGroups,
} from "../components/event-list/grouping";

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
// for server aggregation (lastUpdated, sequence), and the raw
// partOf/colocatedWith arrays — clients read the resolved *Links instead.
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

export type EventListView = {
  displayEvents: DisplayEvent[];
  heroEvents: HeroEvent[];
  groups: Group[];
  // One entry per displayed row, for client-side view and search filtering.
  rows: ListRow[];
  // The live events under the current chips, whichever view is shown; the
  // client counts the starred tab against these.
  liveKeys: string[];
  counts: Counts;
  lastUpdatedDate: string | undefined;
};

function buildHeroEvents(events: ScheduledEvent[], now: Date): HeroEvent[] {
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
  validEventPaths?: Set<string>;
};

function searchHaystack(e: ScheduledEvent): string {
  return [e.name, e.abbreviation, e.location, e.format, ...e.tags]
    .filter((part) => part !== undefined)
    .join("\n")
    .toLowerCase();
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
  return toCalendarDate(e.date.start)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

// Soonest next deadline first; then events with no deadline listed yet; then
// events past every listed deadline. Within the last two, alphabetical.
const standingRank = { upcoming: 0, unlisted: 1, closed: 2 } as const;

function sortByNextDeadline(
  events: ScheduledEvent[],
  now: Date
): ScheduledEvent[] {
  const decorated = events.map((e) => {
    const standing = deadlineStanding(e, now);
    return {
      e,
      rank: standingRank[standing.kind],
      time: standing.kind === "upcoming" ? standing.next.time : 0,
    };
  });
  decorated.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.time - b.time ||
      a.e.abbreviation.localeCompare(b.e.abbreviation)
  );
  return decorated.map((d) => d.e);
}

export function computeEventListView(
  events: ScheduledEvent[],
  filters: FilterParams,
  now: Date,
  options: ComputeOptions = {}
): EventListView {
  const { validEventPaths } = options;
  const isArchive = filters.view === "archive";

  const activeEvents = events.filter(isActiveAt(now));
  const liveEvents = activeEvents.filter(matchesChips(filters));
  const listed = isArchive
    ? events.filter(hasEndedAt(now)).filter(matchesChips(filters))
    : liveEvents;

  const sorted = isArchive
    ? sortArchived(listed)
    : sortByNextDeadline(listed, now);
  const displayEvents = sorted.map((e) => toDisplayEvent(e, validEventPaths));

  const hasOpenSubmission = hasOpenSubmissionAt(now);

  return {
    displayEvents,
    heroEvents: buildHeroEvents(activeEvents, now),
    groups: isArchive
      ? buildArchiveGroups(displayEvents)
      : buildGroups(displayEvents, now),
    rows: sorted.map((e) => ({
      key: eventKey(e),
      open: !isArchive && hasOpenSubmission(e),
      haystack: searchHaystack(e),
    })),
    liveKeys: liveEvents.map(eventKey),
    counts: computeCounts(events, filters, now),
    lastUpdatedDate: events
      .map((e) => e.lastUpdated)
      .sort()
      .at(-1),
  };
}
