"use client";

import { useMemo } from "react";
import { eventKey } from "../../lib/event";
import {
  buildSearchHaystack,
  type DisplayEvent,
} from "../../lib/event-list-view";
import { useCounts } from "./counts-context";
import { useSearchQuery } from "./search-provider";

export function SearchEmptyState({ events }: { events: DisplayEvent[] }) {
  const query = useSearchQuery();
  const needle = query.trim().toLowerCase();
  const { matchesActiveView } = useCounts();

  const anyMatch = useMemo(() => {
    if (needle === "") return true;
    // Restrict matching to rows the user can actually see under the current
    // view filter — otherwise a search that only hits non-starred events
    // under view=starred silently suppresses the empty state.
    return events.some(
      (e) =>
        matchesActiveView(eventKey(e)) &&
        buildSearchHaystack(e).includes(needle)
    );
  }, [needle, events, matchesActiveView]);

  if (needle === "" || anyMatch) return null;
  return (
    <div className="px-5 py-8 text-[13px] text-ink-3 md:px-8">
      No events match “{query}”.
    </div>
  );
}
