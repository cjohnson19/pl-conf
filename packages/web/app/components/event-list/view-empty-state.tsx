"use client";

import { useSearchParams } from "next/navigation";
import { useCounts } from "./counts-context";
import { EmptyNote } from "./empty-note";

export function NoEventsMessage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  if (view === "starred") return null;
  return (
    <EmptyNote>
      {view === "archive"
        ? "No past events match these filters."
        : "No events match these filters."}
    </EmptyNote>
  );
}

export function NoSubmissionsMessage() {
  const searchParams = useSearchParams();
  const { viewCounts } = useCounts();
  const view = searchParams.get("view");
  if (view !== "submissions") return null;
  if (viewCounts.submissions > 0) return null;
  return <EmptyNote>No events have open submissions right now.</EmptyNote>;
}
