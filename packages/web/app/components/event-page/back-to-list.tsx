"use client";

import { type MouseEvent, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { resolveEventDepth } from "../../lib/nav-depth";

export function BackToList() {
  const [depth, setDepth] = useState<number | undefined>(undefined);

  useEffect(() => setDepth(resolveEventDepth()), []);

  // The href is the real fallback, not decoration: it serves the first paint,
  // no-JS, modified clicks, and arrivals that have no list entry behind them.
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (depth === undefined) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    window.history.go(-depth);
  }

  return (
    <Link
      href="/"
      onClick={onClick}
      className="group/back mb-8 inline-flex items-center gap-1.5 text-[13px] text-ink-3 no-underline transition-colors hover:text-ink"
    >
      <ArrowLeft
        size={14}
        strokeWidth={1.75}
        className="transition-transform group-hover/back:-translate-x-0.5"
        aria-hidden
      />
      All events
    </Link>
  );
}
