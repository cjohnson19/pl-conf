"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { Skeleton } from "../ui/skeleton";
import { useDisplayPref, usePrefsLoaded } from "../preferences-provider";
import { cardGridClass } from "./layout-switcher";
import { useViewNav } from "./view-nav-provider";

// Rows per placeholder group, widths varied so the sheet reads as content
// rather than stripes. Keys are literal because Biome bans index keys.
const GROUPS = [
  { key: "g1", rows: ["a", "b", "c", "d"] },
  { key: "g2", rows: ["a", "b", "c"] },
];
const TITLE_WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-2/5"];
const CARDS = ["a", "b", "c", "d", "e", "f"];

export function ListSkeletonBoundary({ children }: { children: ReactNode }) {
  const { pending } = useViewNav();
  const prefsLoaded = usePrefsLoaded();
  const layout = useDisplayPref("layout") ?? "list";
  if (!pending) return <>{children}</>;
  return (
    <div
      data-list-skeleton
      aria-hidden
      // Fades in after a beat so fast switches swap straight to content
      // instead of flashing the skeleton.
      style={{ animation: "skeleton-in 150ms ease-out 120ms both" }}
    >
      {prefsLoaded && layout === "grid" ? <GridSkeleton /> : <ListSkeleton />}
    </div>
  );
}

function ListSkeleton() {
  return GROUPS.map((g, gi) => (
    <section key={g.key}>
      <div
        className={clsx(
          "flex items-end justify-between gap-4 border-b-2 border-rule px-5 pb-3 pt-4 md:px-8",
          gi > 0 && "border-t-2"
        )}
      >
        <Skeleton className="h-6 w-40 sm:h-7" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      {g.rows.map((row, i) => (
        <SkeletonRow
          key={row}
          isFirst={i === 0}
          titleWidth={TITLE_WIDTHS[i % TITLE_WIDTHS.length]}
        />
      ))}
    </section>
  ));
}

function SkeletonRow({
  isFirst,
  titleWidth,
}: {
  isFirst: boolean;
  titleWidth: string;
}) {
  return (
    <div className="@container/row">
      <div
        className={clsx(
          "event-row-grid grid items-center px-5 py-[22px] md:px-8",
          !isFirst && "border-t border-rule"
        )}
      >
        <div
          className="flex flex-col items-start gap-1.5 self-start @[680px]/row:self-auto"
          style={{ gridArea: "date" }}
        >
          <Skeleton className="h-7 w-9" />
          <Skeleton className="h-3 w-11" />
        </div>
        <div className="flex flex-col gap-2" style={{ gridArea: "title" }}>
          <Skeleton className={clsx("h-5 max-w-[340px]", titleWidth)} />
          <Skeleton className="h-3.5 w-2/5 max-w-[220px]" />
        </div>
        <div
          className="hidden flex-col gap-2 @[680px]/row:flex"
          style={{ gridArea: "rail" }}
        >
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
        <div className="flex justify-end" style={{ gridArea: "actions" }}>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className={cardGridClass}>
      {CARDS.map((card) => (
        <div
          key={card}
          className="flex h-full flex-col gap-3 border border-rule p-4"
        >
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="mt-auto h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}
