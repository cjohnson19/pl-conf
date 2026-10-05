"use client";

import Link from "next/link";
import { useListHref } from "../../hooks/use-list-href";

// The archive is its own page, so it is offered where it belongs in reading
// order: after the live list, as a link rather than a tab.
export function ArchiveNote({ count }: { count: number }) {
  const href = useListHref("/archive/");
  return (
    <div className="mx-5 mt-8 flex flex-col items-start gap-4 border border-dashed border-rule p-5 sm:p-7 md:mx-8 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-6">
      <div className="text-[13px] text-ink-2">
        Looking for something that already happened?{" "}
        {count === 0 ? (
          "Nothing matching these filters has finished yet."
        ) : (
          <>
            <b className="font-semibold text-ink">
              {count} past event{count === 1 ? "" : "s"}
            </b>{" "}
            {count === 1 ? "is" : "are"} kept in the archive.
          </>
        )}
      </div>
      <Link
        href={href}
        className="inline-flex h-[38px] flex-shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-medium text-paper no-underline transition-colors hover:bg-accent"
      >
        Browse past events →
      </Link>
    </div>
  );
}
