"use client";

import { useSearchParams } from "next/navigation";
import { useCounts } from "./counts-context";

export function NoEventsMessage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  if (view === "starred") return null;
  return (
    <div className="px-5 py-8 text-[13px] text-ink-3 md:px-8">
      No events match these filters.
    </div>
  );
}

export function NoSubmissionsMessage() {
  const searchParams = useSearchParams();
  const { viewCounts } = useCounts();
  const view = searchParams.get("view");
  if (view !== "submissions") return null;
  if (viewCounts.submissions > 0) return null;
  return (
    <div className="px-5 py-8 text-[13px] text-ink-3 md:px-8">
      No events have open submissions right now.
    </div>
  );
}
