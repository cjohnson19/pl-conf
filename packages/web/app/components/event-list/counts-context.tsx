"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useSearchParams } from "next/navigation";
import { computeCounts, type Counts } from "../../lib/counts";
import type { CountableEvent } from "../../lib/event-list-view";
import {
  parseCategoryParam,
  parseTagsParam,
  parseViewParam,
} from "../../lib/filter-params";
import { collectStarredKeys } from "../../lib/user-prefs";
import { useEventPrefs, usePrefsLoaded } from "../preferences-provider";

type CountsContextValue = Counts & {
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
  const category = parseCategoryParam(searchParams.get("c"));
  const activeTags = parseTagsParam(searchParams.get("tags"));
  const view = parseViewParam(searchParams.get("view"));

  const keyMap = useMemo(
    () => new Map(events.map((e) => [e.key, e])),
    [events]
  );
  const starredKeys = useMemo(
    () => collectStarredKeys(eventPrefs),
    [eventPrefs]
  );

  const matchesActiveView = useCallback(
    (key: string): boolean => {
      const e = keyMap.get(key);
      if (!e) return false;
      if (eventPrefs[key]?.hidden) return false;
      if (view === "starred" && !starredKeys.has(key)) return false;
      if (view === "submissions" && !e.hasOpenSubmission) return false;
      // The archive is server-rendered on its own, so whichever rows are on the
      // page already belong to the active view — nothing further to filter.
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
    return {
      ...computeCounts(visible, {
        category,
        tags: activeTags,
        view,
        starredKeys,
        starredLoaded: prefsLoaded,
      }),
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
    view,
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
  const searchParams = useSearchParams();
  if (searchParams.get("view") === "archive") {
    return (
      <span className="hidden text-[13px] text-ink-3 lg:inline">
        past events · most recent first
      </span>
    );
  }
  return (
    <span className="hidden text-[13px] text-ink-3 lg:inline">
      sorted by next deadline ·{" "}
      <b className="font-medium text-ink-2">{dueThisWeek}</b> deadline
      {dueThisWeek === 1 ? "" : "s"} this week
    </span>
  );
}
