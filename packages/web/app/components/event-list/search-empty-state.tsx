"use client";

import { useMemo } from "react";
import {
  buildSearchHaystack,
  type DisplayEvent,
} from "../../lib/event-list-view";
import { useSearchQuery } from "./search-provider";

export function SearchEmptyState({ events }: { events: DisplayEvent[] }) {
  const query = useSearchQuery();
  const needle = query.trim().toLowerCase();

  const anyMatch = useMemo(() => {
    if (needle === "") return true;
    return events.some((e) => buildSearchHaystack(e).includes(needle));
  }, [needle, events]);

  if (needle === "" || anyMatch) return null;
  return (
    <div className="px-5 py-8 text-[13px] text-ink-3 md:px-8">
      No events match “{query}”.
    </div>
  );
}
