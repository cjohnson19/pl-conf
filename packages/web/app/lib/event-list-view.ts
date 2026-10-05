import {
  type CalendarDate,
  type ScheduledEvent,
  calendarDate,
  eventKey,
  eventPathFromSlug,
  eventSlug,
  hasEndedAt,
  hasOpenSubmissionAt,
  isActiveAt,
} from "./event";
import { type Counts, computeCounts, matchesChips } from "./counts";
import {
  type DatedEntry,
  type DeadlineStanding,
  deadlineStanding,
  findNextStart,
  upcomingEntries,
} from "./deadline";
import type { FilterParams } from "./filter-params";
import type { ListRow } from "./list-visibility";
import {
  type Group,
  type GroupHeading,
  groupConsecutive,
  liveHeading,
  monthHeading,
} from "../components/event-list/grouping";

export type HeroEvent = {
  key: string;
  abbreviation: string;
  type: ScheduledEvent["type"];
  location?: string;
  // All deadlines future-at-SSR, sorted ascending. Hero picks the first one
  // still future as of live `now`, so as the user keeps the tab open and a
  // round elapses, the alert rolls to the next round instead of disappearing.
  upcomingDeadlines: DatedEntry[];
  upcomingStart?: { date: CalendarDate; time: number };
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
  lastUpdatedDate: CalendarDate | undefined;
};

function buildHeroEvents(events: ScheduledEvent[], now: Date): HeroEvent[] {
  return events.flatMap((e) => {
    const upcomingDeadlines = upcomingEntries(e, now);
    const upcomingStart = findNextStart(e, now);
    if (upcomingDeadlines.length === 0 && !upcomingStart) return [];
    return [
      {
        key: eventKey(e),
        abbreviation: e.abbreviation,
        type: e.type,
        location: e.location,
        upcomingDeadlines,
        upcomingStart,
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
  return e.date.start === "TBD"
    ? Number.NEGATIVE_INFINITY
    : calendarDate(e.date.start).getTime();
}

// Soonest next deadline first; then events with no deadline listed yet; then
// events past every listed deadline. Within the last two, alphabetical.
const standingRank = { upcoming: 0, unlisted: 1, closed: 2 } as const;
const nextTime = (s: DeadlineStanding) =>
  s.kind === "upcoming" ? s.next.time : 0;

function sortByNextDeadline(
  events: ScheduledEvent[],
  now: Date
): { event: ScheduledEvent; heading: GroupHeading }[] {
  return events
    .map((event) => ({ event, standing: deadlineStanding(event, now) }))
    .sort(
      (a, b) =>
        standingRank[a.standing.kind] - standingRank[b.standing.kind] ||
        nextTime(a.standing) - nextTime(b.standing) ||
        a.event.abbreviation.localeCompare(b.event.abbreviation)
    )
    .map(({ event, standing }) => ({ event, heading: liveHeading(standing) }));
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
    ? sortArchived(
        events.filter(hasEndedAt(now)).filter(matchesChips(filters))
      ).map((event) => ({ event, heading: monthHeading(event) }))
    : sortByNextDeadline(liveEvents, now);
  const displayed = listed.map(({ event, heading }) => ({
    event: toDisplayEvent(event, validEventPaths),
    heading,
  }));

  const hasOpenSubmission = hasOpenSubmissionAt(now);

  return {
    displayEvents: displayed.map((d) => d.event),
    heroEvents: buildHeroEvents(activeEvents, now),
    groups: groupConsecutive(displayed),
    rows: listed.map(({ event: e }) => ({
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
