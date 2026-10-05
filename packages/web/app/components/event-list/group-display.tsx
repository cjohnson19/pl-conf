"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import {
  type CalendarDate,
  calendarDate,
  isDeadlinePast,
  isDeadlineUrgent,
} from "../../lib/event";
import { humanCountdown } from "../../lib/countdown";
import { setDisplayPref } from "../../lib/preferences-store";
import { useSessionStorageStringSet } from "../../hooks/use-session-storage";
import { useNow } from "./now-provider";
import { useListFilter } from "./list-filter";
import { type GroupHeading, headingId } from "./grouping";
import { Icon } from "../icons";
import { LocalDate, useLocalDate } from "../local-date";
import { useDisplayPref } from "../../hooks/use-preferences";

const SESSION_COLLAPSED_KEY = "collapsedDateGroups";

const SUBLINE_TEXT =
  "font-mono text-[10px] tracking-[0.06em] text-ink-3 sm:text-[11px]";

type HeaderChrome = {
  isFirst: boolean;
  collapsed: boolean;
  onToggle: () => void;
  controlsId: string;
};

// The sticky disclosure strip every group header shares.
function GroupHeaderShell({
  label,
  isFirst,
  collapsed,
  onToggle,
  controlsId,
  children,
}: HeaderChrome & { label: string; children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-paper">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={controlsId}
        aria-label={
          collapsed ? `Show events for ${label}` : `Hide events for ${label}`
        }
        className={clsx(
          "flex w-full items-end justify-between gap-4 px-5 pb-3 pt-4 text-left md:px-8",
          "border-b-2 border-rule transition-colors hover:bg-paper-2",
          !isFirst && "border-t-2"
        )}
      >
        {children}
      </button>
    </div>
  );
}

function HeaderRail({
  note,
  count,
  collapsed,
}: {
  note?: React.ReactNode;
  count: number;
  collapsed: boolean;
}) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col items-end gap-1 font-mono text-[11px] tracking-[0.04em] text-ink-3">
        {note}
        <div>
          <b className="font-medium text-ink-2">{count}</b> event
          {count === 1 ? "" : "s"}
        </div>
      </div>
      <Icon
        name="chevron-down"
        size={16}
        strokeWidth={1.75}
        className={clsx(
          "shrink-0 text-ink-3 transition-transform duration-200 ease-out",
          collapsed && "-rotate-90"
        )}
      />
    </div>
  );
}

// Month heading for the archive, where nothing is counting down.
function MonthGroupHeader({
  month,
  count,
  ...chrome
}: HeaderChrome & { month: string; count: number }) {
  const known = month !== "unknown";
  const [y, m] = month.split("-").map(Number);
  const localMonth = useLocalDate(known ? `${y}/${m}/1` : "TBD", "monthLong");
  const monthName = known ? localMonth : "Date unknown";
  const label = known ? `${monthName} ${y}` : monthName;
  return (
    <GroupHeaderShell label={label} {...chrome}>
      <h2 className="flex items-baseline gap-2.5 font-ui text-[18px] font-semibold leading-none tracking-[-0.02em] text-ink-2 sm:text-[22px]">
        <span>{monthName}</span>{" "}
        {known && (
          <span className="font-mono text-[12px] font-medium tracking-[0.06em] text-ink-3">
            {y}
          </span>
        )}
      </h2>
      <HeaderRail count={count} collapsed={chrome.collapsed} />
    </GroupHeaderShell>
  );
}

// Heading for the two catch-alls at the foot of the live list, set like the
// dated header's "Month Year / Weekday" pair (a touch larger, with no numeral
// to carry the strip).
function StatusGroupHeader({
  title,
  count,
  ...chrome
}: HeaderChrome & { title: string; count: number }) {
  return (
    <GroupHeaderShell label={title} {...chrome}>
      <h2 className="flex flex-col gap-1 leading-none">
        <span className="font-mono text-[13px] font-medium tracking-[0.08em] text-ink sm:text-[14px]">
          {title}
        </span>{" "}
        <span className={SUBLINE_TEXT}>Event ahead</span>
      </h2>
      <HeaderRail count={count} collapsed={chrome.collapsed} />
    </GroupHeaderShell>
  );
}

function DeadlineGroupHeader({
  date,
  count,
  now,
  ...chrome
}: HeaderChrome & { date: CalendarDate; count: number; now: Date }) {
  const cal = calendarDate(date);
  const label = useLocalDate(date, "monDayYear");
  const urgent = isDeadlineUrgent(date, now);
  const past = isDeadlinePast(date, now);
  return (
    <GroupHeaderShell label={label} {...chrome}>
      <h2 className="flex items-end gap-3 font-ui">
        <span
          className={clsx(
            "font-semibold leading-[0.8] tracking-[-0.025em] tabular-nums",
            "text-[30px] sm:text-[36px]",
            urgent ? "text-hot" : "text-accent"
          )}
        >
          {cal.getDate()}
        </span>
        <span className="flex flex-col gap-1 leading-none">
          <span className="font-mono text-[12px] font-medium tracking-[0.08em] text-ink sm:text-[13px]">
            <LocalDate date={date} style="monthLong" /> {cal.getFullYear()}
          </span>
          <span className={SUBLINE_TEXT}>
            <LocalDate date={date} style="weekdayLong" />
          </span>
        </span>
      </h2>
      <HeaderRail
        note={
          !past && (
            <span
              className={clsx(
                "font-medium",
                urgent ? "text-hot" : "text-accent"
              )}
            >
              {humanCountdown(date, now)}
            </span>
          )
        }
        count={count}
        collapsed={chrome.collapsed}
      />
    </GroupHeaderShell>
  );
}

function GroupHeader({
  heading,
  now,
  ...rest
}: HeaderChrome & { heading: GroupHeading; count: number; now: Date }) {
  switch (heading.kind) {
    case "month":
      return <MonthGroupHeader month={heading.month} {...rest} />;
    case "deadline":
      return <DeadlineGroupHeader date={heading.date} now={now} {...rest} />;
    case "unlisted":
      return <StatusGroupHeader title="No deadlines" {...rest} />;
    case "closed":
      return <StatusGroupHeader title="Deadlines passed" {...rest} />;
  }
}

export function CollapsibleGroup({
  groupKey,
  heading,
  groupKeys,
  isFirst,
  showCollapseHint,
  children,
}: {
  groupKey: string;
  heading: GroupHeading;
  groupKeys: string[];
  isFirst: boolean;
  showCollapseHint: boolean;
  children: React.ReactNode;
}) {
  const now = useNow();
  const { visible } = useListFilter();
  const count = groupKeys.filter((k) => visible.has(k)).length;
  const collapseId = headingId(heading);
  const [collapsedIds, setCollapsedIds] = useSessionStorageStringSet(
    SESSION_COLLAPSED_KEY
  );
  const collapsed = collapsedIds.has(collapseId);
  const toggleCollapsed = () =>
    setCollapsedIds((prev) => {
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
  const showHint = showCollapseHint && !collapseHintDismissed;
  const onDismissHint = () => setDisplayPref("collapseHintDismissed", true);

  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // Measured lazily: groups that are never toggled never run a ResizeObserver
  // or store a height. Until the first toggle, `height: undefined` lets the
  // content render at its natural height.
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined
  );
  const contentId = `group-content-${groupKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const handleToggle = () => {
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
  };

  return (
    <section
      ref={sectionRef}
      data-group-keys={groupKeys.join(",")}
      className={clsx("relative", !isFirst && "-mt-[2px]")}
    >
      <GroupHeader
        heading={heading}
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
