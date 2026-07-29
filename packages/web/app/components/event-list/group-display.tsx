"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, X } from "lucide-react";
import {
  isDeadlineUrgent,
  toAoeInstant,
  toCalendarDate,
} from "../../lib/event";
import { humanCountdown } from "../../lib/countdown";
import {
  monDayYearFmt,
  monthLongFmt,
  weekdayLongFmt,
} from "../../lib/date-formatters";
import {
  stringSetCodec,
  useSessionStorage,
} from "../../hooks/use-session-storage";
import { useNow } from "./now-provider";
import { useCounts } from "./counts-context";
import type { GroupHeading } from "./grouping";
import { setPrefs, useDisplayPref } from "../preferences-provider";

const SESSION_COLLAPSED_KEY = "collapsedDateGroups";

function EventCount({ count }: { count: number }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
      <b className="font-medium text-ink-2">{count}</b> event
      {count === 1 ? "" : "s"}
    </div>
  );
}

// Month heading for the archive, where nothing is counting down.
function MonthGroupHeader({
  month,
  count,
  isFirst,
  collapsed,
  onToggle,
  controlsId,
}: {
  month: string;
  count: number;
  isFirst: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  controlsId?: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const cal = y && m ? new Date(y, m - 1, 1) : null;
  const label = cal ? `${monthLongFmt.format(cal)} ${y}` : "Date unknown";
  const inner = (
    <>
      <h2 className="flex items-baseline gap-2.5 font-ui text-[18px] font-semibold leading-none tracking-[-0.02em] text-ink-2 sm:text-[22px]">
        <span suppressHydrationWarning>
          {cal ? monthLongFmt.format(cal) : "Date unknown"}
        </span>{" "}
        {cal && (
          <span className="font-mono text-[12px] font-medium tracking-[0.06em] text-ink-3">
            {y}
          </span>
        )}
      </h2>
      <div className="flex items-end gap-3">
        <EventCount count={count} />
        {onToggle && (
          <ChevronDown
            aria-hidden
            size={16}
            strokeWidth={1.75}
            className={clsx(
              "shrink-0 text-ink-3 transition-transform duration-200 ease-out",
              collapsed && "-rotate-90"
            )}
          />
        )}
      </div>
    </>
  );
  const layout = clsx(
    "flex items-end justify-between gap-4 px-5 pb-3 pt-4 md:px-8",
    "border-b-2 border-rule",
    !isFirst && "border-t-2"
  );
  return (
    <div className="sticky top-0 z-10" style={{ background: "var(--paper)" }}>
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={controlsId}
          aria-label={
            collapsed ? `Show events for ${label}` : `Hide events for ${label}`
          }
          className={clsx(
            layout,
            "w-full text-left transition-colors hover:bg-paper-2"
          )}
          // The label carries a locale-formatted month, which the server and
          // the viewer's browser can disagree on.
          suppressHydrationWarning
        >
          {inner}
        </button>
      ) : (
        <div className={layout}>{inner}</div>
      )}
    </div>
  );
}

function DeadlineGroupHeader({
  date,
  count,
  now,
  isFirst,
  collapsed,
  onToggle,
  controlsId,
}: {
  date: string | null;
  count: number;
  now: Date;
  isFirst: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  controlsId?: string;
}) {
  const borderClasses = clsx(
    "border-b-2 border-rule",
    !isFirst && "border-t-2"
  );
  if (date === null) {
    return (
      <div className="sticky top-0 z-10" style={{ background: "var(--paper)" }}>
        <div
          className={clsx(
            "flex items-end justify-between gap-4 px-5 pb-3 pt-4 md:px-8",
            borderClasses
          )}
        >
          <h2 className="font-ui text-[18px] font-semibold leading-none tracking-[-0.02em] text-ink-2 sm:text-[22px]">
            Deadlines closed
            <span className="font-normal text-ink-3"> · event ahead</span>
          </h2>
          <EventCount count={count} />
        </div>
      </div>
    );
  }
  const cal = toCalendarDate(date);
  if (!cal) return null;
  const urgent = isDeadlineUrgent(date, now);
  const instant = toAoeInstant(date);
  const past = instant ? instant.getTime() < now.getTime() : false;
  const collapsible = onToggle !== undefined;
  const dateLabel = monDayYearFmt.format(cal);
  const innerContent = (
    <>
      <h2 className="flex items-end gap-3 font-ui">
        <span
          className={clsx(
            "font-semibold leading-[0.8] tracking-[-0.025em] tabular-nums",
            "text-[30px] sm:text-[36px]",
            urgent ? "text-hot" : "text-[color:var(--accent)]"
          )}
        >
          {cal.getDate()}
        </span>
        <span className="flex flex-col gap-1 leading-none">
          <span
            className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink sm:text-[13px]"
            suppressHydrationWarning
          >
            {monthLongFmt.format(cal)} {cal.getFullYear()}
          </span>
          <span
            className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 sm:text-[11px]"
            suppressHydrationWarning
          >
            {weekdayLongFmt.format(cal)}
          </span>
        </span>
      </h2>
      <div className="flex items-end gap-3">
        <div className="flex flex-col items-end gap-1 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
          {!past && (
            <span
              className={clsx(
                "font-medium",
                urgent ? "text-hot" : "text-[color:var(--accent)]"
              )}
            >
              {humanCountdown(date, now)}
            </span>
          )}
          <span>
            <b className="font-medium text-ink-2">{count}</b> event
            {count === 1 ? "" : "s"}
          </span>
        </div>
        {collapsible && (
          <ChevronDown
            aria-hidden
            size={16}
            strokeWidth={1.75}
            className={clsx(
              "shrink-0 text-ink-3 transition-transform duration-200 ease-out",
              collapsed && "-rotate-90"
            )}
          />
        )}
      </div>
    </>
  );
  return (
    <div className="sticky top-0 z-10" style={{ background: "var(--paper)" }}>
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={controlsId}
          aria-label={
            collapsed
              ? `Show events for ${dateLabel}`
              : `Hide events for ${dateLabel}`
          }
          className={clsx(
            "flex w-full items-end justify-between gap-4 px-5 pb-3 pt-4 text-left transition-colors md:px-8 hover:bg-paper-2",
            borderClasses
          )}
          suppressHydrationWarning
        >
          {innerContent}
        </button>
      ) : (
        <div
          className={clsx(
            "flex items-end justify-between gap-4 px-5 pb-3 pt-4 md:px-8",
            borderClasses
          )}
        >
          {innerContent}
        </div>
      )}
    </div>
  );
}

export function CollapsibleGroup({
  groupKey,
  heading,
  groupKeys,
  isFirst,
  isFirstCollapsible,
  children,
}: {
  groupKey: string;
  heading: GroupHeading;
  groupKeys: string[];
  isFirst: boolean;
  isFirstCollapsible: boolean;
  children: React.ReactNode;
}) {
  const now = useNow();
  // Count visible (post-view-filter, post-hidden) rows in this group so the
  // header matches what's actually on screen.
  const { countGroup } = useCounts();
  const count = countGroup(groupKeys);
  // Dated and month groups collapse (keyed by the date / "YYYY-MM" they head);
  // the catch-all "Deadlines closed" group has nothing unique to key on.
  const collapseId =
    heading.kind === "month" ? heading.month : (heading.date ?? null);
  const [collapsedDates, setCollapsedDates] = useSessionStorage(
    SESSION_COLLAPSED_KEY,
    new Set<string>(),
    stringSetCodec
  );
  const collapsed = collapseId !== null && collapsedDates.has(collapseId);
  const toggleCollapsed = () =>
    setCollapsedDates((prev) => {
      if (collapseId === null) return prev;
      const next = new Set(prev);
      if (next.has(collapseId)) next.delete(collapseId);
      else next.add(collapseId);
      return next;
    });

  // Rendered during SSR (dismissal is only known client-side) so first paint
  // already includes the tip — waiting for prefs to load inserted it after
  // hydration and shifted the whole list down. Visitors who dismissed it get
  // it hidden pre-paint by the layout.tsx script; React unmounts it here once
  // prefs load, while it's already display:none.
  const collapseHintDismissed = useDisplayPref("collapseHintDismissed");
  const showHint = isFirstCollapsible && !collapseHintDismissed;
  const onDismissHint = () =>
    setPrefs((p) => ({
      ...p,
      display: { ...p.display, collapseHintDismissed: true },
    }));

  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // Measured lazily: groups that are never toggled never run a ResizeObserver
  // or store a height. Until the first toggle, `height: undefined` lets the
  // content render at its natural height.
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined
  );
  const contentId = `group-content-${groupKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const handleToggle =
    collapseId !== null
      ? () => {
          const willCollapse = !collapsed;
          const el = innerRef.current;
          // Capture a fresh measurement on every toggle so the animation
          // reflects the current rendered height (handles viewport changes
          // between toggles without a long-lived observer).
          const measured = el?.scrollHeight ?? contentHeight;
          if (willCollapse && measured !== undefined) {
            setContentHeight(measured);
            requestAnimationFrame(() => toggleCollapsed());
          } else {
            if (measured !== undefined) setContentHeight(measured);
            toggleCollapsed();
          }
          const sectionEl = sectionRef.current;
          const shouldRestoreScroll =
            willCollapse &&
            sectionEl !== null &&
            sectionEl.getBoundingClientRect().top < 0;
          if (shouldRestoreScroll) {
            requestAnimationFrame(() => {
              sectionRef.current?.scrollIntoView({ block: "start" });
            });
          }
        }
      : undefined;

  return (
    <section
      ref={sectionRef}
      data-group-keys={groupKeys.join(",")}
      className={clsx("relative", !isFirst && "-mt-[2px]")}
    >
      {heading.kind === "month" ? (
        <MonthGroupHeader
          month={heading.month}
          count={count}
          isFirst={isFirst}
          collapsed={collapsed}
          onToggle={handleToggle}
          controlsId={contentId}
        />
      ) : (
        <DeadlineGroupHeader
          date={heading.date}
          count={count}
          now={now}
          isFirst={isFirst}
          collapsed={collapsed}
          onToggle={handleToggle}
          controlsId={contentId}
        />
      )}
      <div
        id={contentId}
        className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
        style={{
          height: collapsed ? 0 : contentHeight,
          maskImage:
            "linear-gradient(to bottom, black calc(100% - 22px), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black calc(100% - 22px), transparent)",
        }}
        aria-hidden={collapsed}
      >
        <div ref={innerRef}>
          {showHint && <CollapseHint onDismiss={onDismissHint} />}
          {children}
        </div>
      </div>
    </section>
  );
}

function CollapseHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      data-collapse-hint
      className="flex items-center justify-between gap-3 border-b border-rule px-5 py-2 text-[11px] italic text-ink-3 md:px-8"
    >
      <span>Tip: tap any heading to hide its events.</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tip"
        className="grid h-6 w-6 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
      >
        <X size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}
