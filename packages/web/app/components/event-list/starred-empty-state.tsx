"use client";

import { withParams } from "../../lib/filter-params";
import { useListFilter } from "./list-filter";

export function StarredEmptyState({ totalActive }: { totalActive: number }) {
  const { view, starred, hydrated } = useListFilter();
  if (view !== "starred" || !hydrated) return null;
  const hasOthers = totalActive > starred.size;
  if (starred.size > 0 && !hasOthers) return null;
  const goAll = () =>
    window.history.replaceState(null, "", withParams({ view: undefined }));
  return (
    <div className="mx-5 mt-8 flex flex-col items-start gap-4 border border-dashed border-rule p-5 sm:p-7 md:mx-8 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-6">
      <div className="text-[13px] text-ink-2">
        {starred.size === 0 ? (
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
        className="inline-flex h-[38px] flex-shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-medium text-paper transition-colors hover:bg-accent"
      >
        Browse all events →
      </button>
    </div>
  );
}
