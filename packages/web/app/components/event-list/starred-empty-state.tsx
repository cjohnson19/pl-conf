"use client";

import { useSearchParams } from "next/navigation";
import { useEventPrefs, usePrefsLoaded } from "../preferences-provider";
import { useCounts } from "./counts-context";

export function StarredEmptyState() {
  const eventPrefs = useEventPrefs();
  const prefsLoaded = usePrefsLoaded();
  const searchParams = useSearchParams();
  const { totalActive } = useCounts();
  if (searchParams.get("view") !== "starred") return null;
  if (!prefsLoaded) return null;
  // Filter hidden so "Nothing starred yet" doesn't include hidden favorites in
  // its count of starred entries.
  const starredCount = Object.values(eventPrefs).filter(
    (p) => p?.favorite && !p?.hidden
  ).length;
  const hasOthers = totalActive > starredCount;
  if (starredCount > 0 && !hasOthers) return null;
  const goAll = () => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("view");
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : "?");
  };
  return (
    <div className="mx-5 mt-8 flex flex-col items-start gap-4 border border-dashed border-rule p-5 sm:p-7 md:mx-8 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-6">
      <div className="text-[13px] text-ink-2">
        {starredCount === 0 ? (
          <>
            Nothing starred yet —{" "}
            <b className="font-semibold text-ink">{totalActive} events</b>{" "}
            tracked across conferences, workshops, and symposia. Tap the star
            icon on any row to follow it.
          </>
        ) : (
          <>
            Looking for something else?{" "}
            <b className="font-semibold text-ink">{totalActive} events</b>{" "}
            tracked across conferences, workshops, and symposia.
          </>
        )}
      </div>
      <button
        type="button"
        onClick={goAll}
        className="inline-flex h-[38px] flex-shrink-0 items-center gap-2 rounded-pill bg-ink px-4 text-[13px] font-medium text-paper transition-colors hover:bg-[color:var(--accent)]"
      >
        Browse all events →
      </button>
    </div>
  );
}
