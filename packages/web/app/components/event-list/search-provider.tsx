"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SearchContextValue = {
  query: string;
  setQuery: (next: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

const URL_SYNC_DEBOUNCE_MS = 300;

function syncUrl(query: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (query === "") url.searchParams.delete("q");
  else url.searchParams.set("q", query);
  const search = url.searchParams.toString();
  const next = `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

export function SearchProvider({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) {
  const [query, setQueryState] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => syncUrl(next), URL_SYNC_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const value = useMemo(() => ({ query, setQuery }), [query, setQuery]);
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearchQuery(): string {
  const ctx = useContext(SearchContext);
  if (ctx === null) {
    throw new Error("useSearchQuery must be used inside a <SearchProvider>");
  }
  return ctx.query;
}

export function useSetSearchQuery(): (next: string) => void {
  const ctx = useContext(SearchContext);
  if (ctx === null) {
    throw new Error("useSetSearchQuery must be used inside a <SearchProvider>");
  }
  return ctx.setQuery;
}
