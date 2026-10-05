"use client";

import { useSearchParams } from "next/navigation";
import { useListFilter } from "../components/event-list/list-filter";

// The other list page with the current chips, tags and search carried over.
// Built from React's params plus the context's query rather than
// window.location, so the server and the hydrating client agree.
export function useListHref(path: "/" | "/archive/"): string {
  const searchParams = useSearchParams();
  const { query } = useListFilter();
  const sp = new URLSearchParams(searchParams);
  sp.delete("view");
  if (query.trim()) sp.set("q", query);
  else sp.delete("q");
  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}
