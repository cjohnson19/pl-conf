import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import {
  type ScheduledEvent,
  type Tag,
  eventKey,
  tagValues,
  toCalendarDate,
} from "../../lib/event";
import { findNextDeadline, isDueThisWeek } from "../../lib/deadline";

const MIN_MS = 60_000;
import {
  applyFilters,
  isActive,
  openToNewSubmissions,
} from "../../lib/event-filter";
import {
  type Layout,
  type View,
  useCollapsedDates,
  useHydrated,
  useNow,
  usePreferences,
  useSetNow,
  useView,
} from "../preferences-provider";
import { type Group, buildGroups } from "./grouping";

export type Category =
  | "all"
  | "conference"
  | "workshop"
  | "symposium"
  | "school";
export type { Layout, View };

function hasDeadlineWithinAoeToday(
  events: ScheduledEvent[],
  now: Date
): boolean {
  return events.some((e) => {
    const next = findNextDeadline(e, now);
    if (!next) return false;
    const cal = toCalendarDate(next.date);
    if (!cal) return false;
    return differenceInCalendarDays(cal, now) <= 0;
  });
}

function useTickScheduler(events: ScheduledEvent[]): void {
  const setNow = useSetNow();
  useEffect(() => {
    // Adaptive cadence: minute-grain refresh only when some upcoming deadline
    // is already in today's (or earlier) local calendar date; otherwise wait
    // until next midnight.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const ms = Date.now();
      const realNow = new Date(ms);
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const minuteMode = hasDeadlineWithinAoeToday(events, realNow);
      const delay = minuteMode
        ? MIN_MS - (ms % MIN_MS)
        : midnight.getTime() - ms;
      timeoutId = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [events, setNow]);
}

export type EventListState = {
  prefsLoaded: boolean;
  now: Date;

  layout: Layout;
  setLayout: (next: Layout) => void;

  search: string;
  setSearch: (next: string) => void;
  category: Category;
  setCategory: (next: Category) => void;
  activeTags: Set<Tag>;
  toggleTag: (tag: Tag) => void;
  clearTags: () => void;
  view: View;
  setView: (next: View) => void;

  starredKeys: Set<string>;
  visibleEvents: ScheduledEvent[];
  activeEvents: ScheduledEvent[];
  displayEvents: ScheduledEvent[];
  groups: Group[];

  categoryCounts: Record<Category, number>;
  tagCounts: Record<Tag, number>;
  viewCounts: Record<View, number>;
  dueThisWeek: number;
  totalActive: number;
  starredCount: number;
  hasOthers: boolean;
  lastUpdatedDate: string | undefined;

  collapsedDates: Set<string>;
  toggleCollapsed: (date: string) => void;
  firstCollapsibleIdx: number;
  showCollapseHint: boolean;
  dismissCollapseHint: () => void;
};

export function useEventListState(events: ScheduledEvent[]): EventListState {
  const { prefs, setPrefs, prefsLoaded } = usePreferences();
  const layout: Layout = prefs.display.layout ?? "list";
  const setLayout = (next: Layout) =>
    setPrefs((p) => ({ ...p, display: { ...p.display, layout: next } }));

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [category, setCategory] = useState<Category>("all");
  const [activeTags, setActiveTags] = useState<Set<Tag>>(() => new Set());
  const toggleTag = (tag: Tag) =>
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  const clearTags = () => setActiveTags(new Set());
  const [view, setView] = useView();

  const now = useNow();
  const hydrated = useHydrated();
  useTickScheduler(events);
  const hasOpenSubmission = useMemo(
    () => openToNewSubmissions(true, now),
    [now]
  );

  const starredKeys = useMemo(
    () =>
      new Set(
        Object.entries(prefs.eventPrefs)
          .filter(([, v]) => v?.favorite)
          .map(([k]) => k)
      ),
    [prefs.eventPrefs]
  );

  const visibleEvents = useMemo(
    () =>
      events.filter((e) => !(prefs.eventPrefs[eventKey(e)]?.hidden === true)),
    [events, prefs]
  );

  const activeEvents = useMemo(
    () => (hydrated ? applyFilters(visibleEvents, [isActive]) : visibleEvents),
    [visibleEvents, hydrated]
  );

  const categoryCounts = useMemo<Record<Category, number>>(() => {
    const counts = activeEvents.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<ScheduledEvent["type"], number>
    );
    return {
      all: activeEvents.length,
      conference: counts.conference ?? 0,
      workshop: counts.workshop ?? 0,
      symposium: counts.symposium ?? 0,
      school: 0,
    };
  }, [activeEvents]);

  const searchHaystacks = useMemo(() => {
    const m = new WeakMap<ScheduledEvent, string>();
    events.forEach((e) => {
      const parts = [e.name, e.abbreviation];
      if (e.location) parts.push(e.location);
      if (e.format) parts.push(e.format);
      parts.push(...e.tags);
      m.set(e, parts.join("\n").toLowerCase());
    });
    return m;
  }, [events]);

  const preTagFiltered = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    const matchesSearch: (e: ScheduledEvent) => boolean =
      needle === ""
        ? () => true
        : (e) => (searchHaystacks.get(e) ?? "").includes(needle);
    return applyFilters(activeEvents, [
      (e) => (category === "all" ? true : e.type === category),
      matchesSearch,
    ]);
  }, [activeEvents, category, deferredSearch, searchHaystacks]);

  const tagCounts = useMemo<Record<Tag, number>>(() => {
    const counts = Object.fromEntries(tagValues.map((t) => [t, 0])) as Record<
      Tag,
      number
    >;
    preTagFiltered.forEach((e) => {
      e.tags.forEach((t) => {
        counts[t] += 1;
      });
    });
    return counts;
  }, [preTagFiltered]);

  const baseFiltered = useMemo(() => {
    if (activeTags.size === 0) return preTagFiltered;
    return preTagFiltered.filter((e) => e.tags.some((t) => activeTags.has(t)));
  }, [preTagFiltered, activeTags]);

  const viewCounts = useMemo<Record<View, number>>(
    () => ({
      starred: baseFiltered.filter((e) => starredKeys.has(eventKey(e))).length,
      all: baseFiltered.length,
      submissions: baseFiltered.filter(hasOpenSubmission).length,
    }),
    [baseFiltered, starredKeys, hasOpenSubmission]
  );

  const displayEvents = useMemo(() => {
    const filtered = baseFiltered.filter((e) => {
      if (view === "starred") return starredKeys.has(eventKey(e));
      if (view === "submissions") return hasOpenSubmission(e);
      return true;
    });
    const decorated = filtered.map((e) => ({
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
  }, [baseFiltered, view, starredKeys, now, hasOpenSubmission]);

  const dueThisWeek = useMemo(
    () => displayEvents.filter((e) => isDueThisWeek(e, now)).length,
    [displayEvents, now]
  );
  const groups = useMemo(
    () => buildGroups(displayEvents, now),
    [displayEvents, now]
  );

  const { collapsedDates, toggleCollapsed } = useCollapsedDates();

  const firstCollapsibleIdx = useMemo(
    () => groups.findIndex((g) => g.date !== null),
    [groups]
  );
  const showCollapseHint =
    prefsLoaded &&
    !prefs.display.collapseHintDismissed &&
    firstCollapsibleIdx >= 0 &&
    groups.length > 1;
  const dismissCollapseHint = () =>
    setPrefs((p) => ({
      ...p,
      display: { ...p.display, collapseHintDismissed: true },
    }));

  const totalActive = activeEvents.length;
  const starredCount = starredKeys.size;
  const hasOthers = view === "starred" && totalActive > starredCount;

  const lastUpdatedDate = useMemo(() => {
    const dates = events
      .map((e) => e.lastUpdated)
      .filter((d): d is string => typeof d === "string");
    if (dates.length === 0) return undefined;
    return dates.reduce((max, d) => (d > max ? d : max));
  }, [events]);

  return {
    prefsLoaded,
    now,
    layout,
    setLayout,
    search,
    setSearch,
    category,
    setCategory,
    activeTags,
    toggleTag,
    clearTags,
    view,
    setView,
    starredKeys,
    visibleEvents,
    activeEvents,
    displayEvents,
    groups,
    categoryCounts,
    tagCounts,
    viewCounts,
    dueThisWeek,
    totalActive,
    starredCount,
    hasOthers,
    lastUpdatedDate,
    collapsedDates,
    toggleCollapsed,
    firstCollapsibleIdx,
    showCollapseHint,
    dismissCollapseHint,
  };
}
