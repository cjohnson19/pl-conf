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
import {
  setPrefs,
  useDisplayPref,
  usePrefsLoaded,
} from "../preferences-provider";

const SESSION_COLLAPSED_KEY = "collapsedDateGroups";

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
            No upcoming deadlines
          </h2>
          <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
            <b className="font-medium text-ink-2">{count}</b> event
            {count === 1 ? "" : "s"}
          </div>
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
  groupDate,
  groupKeys,
  count,
  isFirst,
  isFirstCollapsible,
  children,
}: {
  groupKey: string;
  groupDate: string | null;
  groupKeys: string[];
  count: number;
  isFirst: boolean;
  isFirstCollapsible: boolean;
  children: React.ReactNode;
}) {
  const now = useNow();
  const [collapsedDates, setCollapsedDates] = useSessionStorage(
    SESSION_COLLAPSED_KEY,
    new Set<string>(),
    stringSetCodec
  );
  const collapsed = groupDate !== null && collapsedDates.has(groupDate);
  const toggleCollapsed = () =>
    setCollapsedDates((prev) => {
      if (groupDate === null) return prev;
      const next = new Set(prev);
      if (next.has(groupDate)) next.delete(groupDate);
      else next.add(groupDate);
      return next;
    });

  const prefsLoaded = usePrefsLoaded();
  const collapseHintDismissed = useDisplayPref("collapseHintDismissed");
  const showHint = isFirstCollapsible && prefsLoaded && !collapseHintDismissed;
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
    groupDate !== null
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
      <DeadlineGroupHeader
        date={groupDate}
        count={count}
        now={now}
        isFirst={isFirst}
        collapsed={collapsed}
        onToggle={handleToggle}
        controlsId={contentId}
      />
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
    <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-2 text-[11px] italic text-ink-3 md:px-8">
      <span>Tip: tap any date heading to hide its events.</span>
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
