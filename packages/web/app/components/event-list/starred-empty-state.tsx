"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEventPrefs, usePrefsLoaded } from "../preferences-provider";

export function StarredEmptyState({ totalActive }: { totalActive: number }) {
  const eventPrefs = useEventPrefs();
  const prefsLoaded = usePrefsLoaded();
  const router = useRouter();
  const searchParams = useSearchParams();
  if (!prefsLoaded) return null;
  const starredCount = Object.values(eventPrefs).filter(
    (p) => p?.favorite
  ).length;
  const hasOthers = totalActive > starredCount;
  if (starredCount > 0 && !hasOthers) return null;
  const goAll = () => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("view");
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
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
