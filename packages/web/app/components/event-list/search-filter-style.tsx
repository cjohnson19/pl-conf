"use client";

import { useMemo } from "react";
import { eventKey } from "../../lib/event";
import {
  buildSearchHaystack,
  type DisplayEvent,
} from "../../lib/event-list-view";
import { eventKeySelector } from "../../lib/row-css";
import { useSearchQuery } from "./search-provider";

export function SearchFilterStyle({ events }: { events: DisplayEvent[] }) {
  const query = useSearchQuery();

  const rules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return "";
    const matching = events
      .filter((e) => buildSearchHaystack(e).includes(needle))
      .map(eventKey);
    if (matching.length === 0) {
      return "[data-event-key]{display:none}[data-group-keys]{display:none}";
    }
    const sel = matching.map(eventKeySelector).join(",");
    return (
      `[data-event-key]:not(${sel}){display:none}` +
      `[data-group-keys]:not(:has(${sel})){display:none}`
    );
  }, [query, events]);

  if (!rules) return null;
  return <style>{rules}</style>;
}
