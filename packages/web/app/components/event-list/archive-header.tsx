"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useListHref } from "../../hooks/use-list-href";

// Stands where the live list has its view tabs: the archive has no views of
// its own, only a way back.
export function ArchiveHeader({ trailing }: { trailing: ReactNode }) {
  const href = useListHref("/");
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-rule px-5 pb-3 pt-8 md:px-8">
      <div className="flex flex-col gap-2">
        <Link
          href={href}
          className="group/back inline-flex items-center gap-1.5 text-[13px] text-ink-3 no-underline transition-colors hover:text-ink"
        >
          <ArrowLeft
            size={14}
            strokeWidth={1.75}
            className="transition-transform group-hover/back:-translate-x-0.5"
            aria-hidden
          />
          Live events
        </Link>
        <h2 className="font-ui text-[18px] font-semibold leading-none tracking-[-0.02em] text-ink">
          Past events
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-4">{trailing}</div>
    </div>
  );
}
