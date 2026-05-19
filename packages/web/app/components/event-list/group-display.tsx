"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, X } from "lucide-react";
import {
  eventKey,
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
import { EventRow } from "../event-row";
import type { Group } from "./grouping";

export function DeadlineGroupHeader({
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
          <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink sm:text-[13px]">
            {monthLongFmt.format(cal)} {cal.getFullYear()}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 sm:text-[11px]">
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
  group,
  isFirst,
  showHint,
  onDismissHint,
  now,
  collapsed,
  onToggle,
}: {
  group: Group;
  isFirst: boolean;
  showHint: boolean;
  onDismissHint: () => void;
  now: Date;
  collapsed: boolean;
  onToggle: (() => void) | undefined;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined
  );
  const contentId = `group-content-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const handleToggle = onToggle
    ? () => {
        const willCollapse = !collapsed;
        const el = sectionRef.current;
        const shouldRestoreScroll =
          willCollapse && el !== null && el.getBoundingClientRect().top < 0;
        onToggle();
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
      className={clsx("relative", !isFirst && "-mt-[2px]")}
    >
      <DeadlineGroupHeader
        date={group.date}
        count={group.events.length}
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
          {group.events.map((e, i) => (
            <div
              key={eventKey(e)}
              className={clsx("@container/row", i === 0 && "[&>*]:border-t-0")}
            >
              <EventRow event={e} now={now} hideDate={group.date !== null} />
            </div>
          ))}
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
