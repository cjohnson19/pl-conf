"use client";

import { EmptyNote } from "./empty-note";
import { useListFilter } from "./list-filter";

// One message for an empty list, whichever filter emptied it. The starred
// view has its own call to action in StarredEmptyState.
export function ListEmptyState() {
  const { rows, view, query, visible } = useListFilter();
  if (view === "starred") return null;
  if (rows.length === 0) {
    return (
      <EmptyNote>
        {view === "archive"
          ? "No past events match these filters."
          : "No events match these filters."}
      </EmptyNote>
    );
  }
  if (visible.size > 0) return null;
  if (query.trim() !== "") {
    return <EmptyNote>No events match “{query}”.</EmptyNote>;
  }
  if (view === "submissions") {
    return <EmptyNote>No events have open submissions right now.</EmptyNote>;
  }
  return null;
}
