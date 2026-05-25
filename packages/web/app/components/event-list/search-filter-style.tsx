"use client";

import { useMemo } from "react";
import { eventKey } from "../../lib/event";
import {
  buildSearchHaystack,
  type DisplayEvent,
} from "../../lib/event-list-view";
import { useSearchQuery } from "./search-provider";

// Mirrors the prepaint script in app/layout.tsx — works in both SSR and
// browser, unlike CSS.escape which is browser-only. Event keys only contain
// alphanumerics plus a few separators, so escaping \ and " is sufficient.
function escapeAttr(s: string): string {
  return s.replace(/[\\"]/g, "\\$&");
}

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
    const sel = matching
      .map((k) => `[data-event-key="${escapeAttr(k)}"]`)
      .join(",");
    return (
      `[data-event-key]:not(${sel}){display:none}` +
      `[data-group-keys]:not(:has(${sel})){display:none}`
    );
  }, [query, events]);

  if (!rules) return null;
  return <style>{rules}</style>;
}
