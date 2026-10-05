"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { parseViewParam, type View } from "../../lib/filter-params";
import {
  type ListRow,
  visibilityCss,
  visibleKeys,
} from "../../lib/list-visibility";
import { anchorListDepth } from "../../lib/nav-depth";
import { collectStarredKeys } from "../../lib/user-prefs";
import { useEventPrefs, useHydrated } from "../../hooks/use-preferences";

// The client-side state that filters the server-rendered rows: the view tab
// (starred / submissions are CSS filters, not renders), the search box, and
// the starred set. Everything that reacts to it — the row-hiding <style>,
// group counts, the starred tab badge, the empty states — reads this one
// value, so they can't disagree about which rows are on screen.
type ListFilterValue = {
  rows: ListRow[];
  view: View;
  query: string;
  setQuery: (next: string) => void;
  starred: ReadonlySet<string>;
  hydrated: boolean;
  visible: ReadonlySet<string>;
  // Starred events in the live pool under the current chips, or undefined
  // until hydration (a misleading 0 would flash otherwise).
  starredCount: number | undefined;
};

const ListFilterContext = createContext<ListFilterValue | undefined>(undefined);

const PREPAINT_STYLE_IDS = ["pl-prepaint-visibility", "pl-prepaint-stars"];
const URL_SYNC_DEBOUNCE_MS = 300;

function syncQueryToUrl(query: string): void {
  const url = new URL(window.location.href);
  if (query === "") url.searchParams.delete("q");
  else url.searchParams.set("q", query);
  const search = url.searchParams.toString();
  const next = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

function useSearchQuery(defaultValue: string) {
  const [query, setQueryState] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setQuery = (next: string) => {
    setQueryState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => syncQueryToUrl(next),
      URL_SYNC_DEBOUNCE_MS
    );
  };

  useEffect(() => {
    // CloudFront strips `q` from the SSR query (intentional, to keep the
    // origin cache hit rate up). The browser URL still has it, so on mount
    // we backfill from the live location, and again on back/forward.
    const readUrl = () =>
      setQueryState(new URLSearchParams(window.location.search).get("q") ?? "");
    readUrl();
    window.addEventListener("popstate", readUrl);
    return () => {
      window.removeEventListener("popstate", readUrl);
      clearTimeout(timer.current);
    };
  }, []);

  return [query, setQuery] as const;
}

export function ListFilterProvider({
  rows,
  liveKeys,
  defaultQuery,
  archive,
  children,
}: {
  rows: ListRow[];
  // Keys of the live events under the current chips, whatever view is shown;
  // the starred tab counts against these even from the archive.
  liveKeys: string[];
  defaultQuery: string;
  archive: boolean;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const view = archive ? "archive" : parseViewParam(searchParams.get("view"));
  const [query, setQuery] = useSearchQuery(defaultQuery);
  const eventPrefs = useEventPrefs();
  const hydrated = useHydrated();
  const starred = useMemo(() => collectStarredKeys(eventPrefs), [eventPrefs]);
  const visible = useMemo(
    () => visibleKeys(rows, { view, query, starred }),
    [rows, view, query, starred]
  );

  useEffect(() => {
    document.documentElement.dataset.plConfHydrated = "1";
    anchorListDepth();
  }, []);

  useEffect(() => {
    if (hydrated) {
      PREPAINT_STYLE_IDS.forEach((id) => {
        document.getElementById(id)?.remove();
      });
    }
  }, [hydrated]);

  // During hydration the starred set is still the server's empty default, so
  // the starred view keeps the pre-paint rules rather than hiding every row.
  const css =
    view === "starred" && !hydrated ? "" : visibilityCss(rows, visible);

  const value: ListFilterValue = {
    rows,
    view,
    query,
    setQuery,
    starred,
    hydrated,
    visible,
    starredCount: hydrated
      ? liveKeys.filter((k) => starred.has(k)).length
      : undefined,
  };

  return (
    <ListFilterContext.Provider value={value}>
      {css && <style>{css}</style>}
      {children}
    </ListFilterContext.Provider>
  );
}

export function useListFilter(): ListFilterValue {
  const value = useContext(ListFilterContext);
  if (value === undefined) {
    throw new Error("useListFilter must be used inside <ListFilterProvider>");
  }
  return value;
}
