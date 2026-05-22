import clsx from "clsx";

const GROUPS: { rows: number }[] = [{ rows: 2 }, { rows: 3 }, { rows: 2 }];

export function EventListSkeleton() {
  return (
    <div aria-hidden className="pointer-events-none">
      {GROUPS.map((group, gi) => (
        <SkeletonGroup
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
          key={gi}
          rows={group.rows}
          isFirst={gi === 0}
        />
      ))}
    </div>
  );
}

function SkeletonGroup({ rows, isFirst }: { rows: number; isFirst: boolean }) {
  return (
    <section className={clsx("relative", !isFirst && "-mt-[2px]")}>
      <div
        className="border-b-2 border-rule"
        style={{ borderTopWidth: isFirst ? 0 : 2 }}
      >
        <div className="flex items-end justify-between gap-4 px-5 pb-3 pt-4 md:px-8">
          <div className="flex items-end gap-3">
            <div
              className="pl-conf-skeleton-bar"
              style={{ width: 44, height: 30 }}
            />
            <div className="flex flex-col gap-1.5">
              <div
                className="pl-conf-skeleton-bar"
                style={{ width: 100, height: 12 }}
              />
              <div
                className="pl-conf-skeleton-bar"
                style={{ width: 64, height: 10 }}
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div
              className="pl-conf-skeleton-bar"
              style={{ width: 72, height: 11 }}
            />
            <div
              className="pl-conf-skeleton-bar"
              style={{ width: 56, height: 11 }}
            />
          </div>
        </div>
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <SkeletonRow key={ri} />
      ))}
    </section>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-t border-rule px-5 py-[22px] md:gap-5 md:px-8">
      <div className="flex flex-col items-start gap-1.5">
        <div
          className="pl-conf-skeleton-bar"
          style={{ width: 36, height: 22 }}
        />
        <div
          className="pl-conf-skeleton-bar"
          style={{ width: 28, height: 10 }}
        />
        <div
          className="pl-conf-skeleton-bar"
          style={{ width: 28, height: 10 }}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          className="pl-conf-skeleton-bar"
          style={{ width: "40%", height: 22 }}
        />
        <div
          className="pl-conf-skeleton-bar"
          style={{ width: "70%", height: 13 }}
        />
        <div
          className="pl-conf-skeleton-bar"
          style={{ width: "55%", height: 11 }}
        />
      </div>
      <div className="hidden h-10 w-10 shrink-0 md:block" />
    </div>
  );
}
