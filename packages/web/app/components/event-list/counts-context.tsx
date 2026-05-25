"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useSearchParams } from "next/navigation";
import { type Tag, tagValues } from "../../lib/event";
import type { Category, View } from "../../lib/filter-params";
import type { CountableEvent, ViewCounts } from "../../lib/event-list-view";
import { useEventPrefs, usePrefsLoaded } from "../preferences-provider";

const CATEGORY_KEYS: Category[] = [
  "all",
  "conference",
  "workshop",
  "symposium",
  "school",
];
const VIEW_KEYS: View[] = ["starred", "all", "submissions"];
const KNOWN_TAGS = new Set<string>(tagValues);

type CountsContextValue = {
  categoryCounts: Record<Category, number>;
  tagCounts: Record<Tag, number>;
  viewCounts: ViewCounts;
  totalActive: number;
  dueThisWeek: number;
  // Count events in a date group that are still visible under the active view
  // (starred / submissions / all) AND not user-hidden. Used by per-group
  // headers so e.g. "May 30 · 5 events" matches the number of rows the user
  // actually sees.
  countGroup: (groupKeys: string[]) => number;
  // True if an event key passes both the active view filter and the hidden
  // filter — i.e., its row is currently rendered. Used by SearchEmptyState so
  // a query that matches only hidden / off-view events still triggers the
  // "no results" message.
  matchesActiveView: (key: string) => boolean;
};

const CountsContext = createContext<CountsContextValue | null>(null);

export function CountsProvider({
  events,
  children,
}: {
  events: CountableEvent[];
  children: ReactNode;
}) {
  const eventPrefs = useEventPrefs();
  const prefsLoaded = usePrefsLoaded();
  const searchParams = useSearchParams();
  const category = readCategory(searchParams.get("c"));
  const activeTags = readTags(searchParams.get("tags"));
  const view = readView(searchParams.get("view"));

  const keyMap = useMemo(
    () => new Map(events.map((e) => [e.key, e])),
    [events]
  );
  const starredKeys = useMemo(() => collectStarred(eventPrefs), [eventPrefs]);

  const matchesActiveView = useCallback(
    (key: string): boolean => {
      const e = keyMap.get(key);
      if (!e) return false;
      if (eventPrefs[key]?.hidden) return false;
      if (view === "starred" && !starredKeys.has(key)) return false;
      if (view === "submissions" && !e.hasOpenSubmission) return false;
      return true;
    },
    [keyMap, eventPrefs, view, starredKeys]
  );

  const countGroup = useCallback(
    (groupKeys: string[]): number => {
      let n = 0;
      for (const key of groupKeys) if (matchesActiveView(key)) n++;
      return n;
    },
    [matchesActiveView]
  );

  const value = useMemo<CountsContextValue>(() => {
    // Pre-hydration `eventPrefs` is the empty defaults, so this returns the
    // same shape as the SSR counts. After hydration, hidden events drop out
    // and counts shift to reflect what's visible on screen.
    const visible = events.filter((e) => !eventPrefs[e.key]?.hidden);

    const categoryCounts: Record<Category, number> = {
      all: visible.length,
      conference: 0,
      workshop: 0,
      symposium: 0,
      school: 0,
    };
    visible.forEach((e) => {
      categoryCounts[e.category] = (categoryCounts[e.category] ?? 0) + 1;
    });

    const preTagFiltered =
      category === "all"
        ? visible
        : visible.filter((e) => e.category === category);
    const tagCounts = Object.fromEntries(
      tagValues.map((t) => [t, 0])
    ) as Record<Tag, number>;
    preTagFiltered.forEach((e) => {
      e.tags.forEach((t) => {
        tagCounts[t] += 1;
      });
    });

    const baseFiltered =
      activeTags.size === 0
        ? preTagFiltered
        : preTagFiltered.filter((e) => e.tags.some((t) => activeTags.has(t)));

    const viewCounts: ViewCounts = {
      // Match prior SSR semantics: until prefs hydrate, "Starred" count is
      // unknown, so suppress the badge instead of showing a misleading 0.
      starred: prefsLoaded
        ? baseFiltered.filter((e) => starredKeys.has(e.key)).length
        : null,
      all: baseFiltered.length,
      submissions: baseFiltered.filter((e) => e.hasOpenSubmission).length,
    };

    const dueThisWeek = baseFiltered.filter((e) => e.dueThisWeek).length;

    return {
      categoryCounts,
      tagCounts,
      viewCounts,
      totalActive: visible.length,
      dueThisWeek,
      countGroup,
      matchesActiveView,
    };
  }, [
    events,
    eventPrefs,
    prefsLoaded,
    category,
    activeTags,
    starredKeys,
    countGroup,
    matchesActiveView,
  ]);

  return (
    <CountsContext.Provider value={value}>{children}</CountsContext.Provider>
  );
}

export function useCounts(): CountsContextValue {
  const value = useContext(CountsContext);
  if (value === null) {
    throw new Error("useCounts must be used inside a <CountsProvider>");
  }
  return value;
}

export function TotalActiveText() {
  const { totalActive } = useCounts();
  return <>{totalActive}</>;
}

export function DueThisWeekPhrase() {
  const { dueThisWeek } = useCounts();
  return (
    <span className="hidden text-[13px] text-ink-3 lg:inline">
      sorted by next deadline ·{" "}
      <b className="font-medium text-ink-2">{dueThisWeek}</b> deadline
      {dueThisWeek === 1 ? "" : "s"} this week
    </span>
  );
}

function readCategory(raw: string | null): Category {
  return raw && (CATEGORY_KEYS as string[]).includes(raw)
    ? (raw as Category)
    : "all";
}

function readView(raw: string | null): View {
  return raw && (VIEW_KEYS as string[]).includes(raw) ? (raw as View) : "all";
}

function readTags(raw: string | null): Set<Tag> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is Tag => KNOWN_TAGS.has(t))
  );
}

function collectStarred(
  eventPrefs: Record<
    string,
    { favorite?: boolean; hidden?: boolean } | undefined
  >
): Set<string> {
  const out = new Set<string>();
  Object.entries(eventPrefs).forEach(([k, v]) => {
    if (v?.favorite && !v?.hidden) out.add(k);
  });
  return out;
}
