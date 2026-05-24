"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { Github } from "lucide-react";
import { type ScheduledEvent, eventKey } from "../lib/event";
import type { FilterParams } from "../lib/filter-params";
import { EventCard } from "./event-row";
import { TagFilterProvider } from "./event-tags";
import { LastUpdated } from "./last-updated";
import { useEventListState } from "./event-list/use-event-list-state";
import { Hero } from "./event-list/heroes";
import { CollapsibleGroup } from "./event-list/group-display";
import {
  FilterChips,
  LayoutToggle,
  SearchPill,
  TagsFilter,
  ViewTabs,
} from "./event-list/filters";

export function EventListContainer({
  events,
  initialNowMs,
  initialFilters,
}: {
  events: ScheduledEvent[];
  initialNowMs: number;
  initialFilters: FilterParams;
}) {
  useEffect(() => {
    document.documentElement.dataset.plConfHydrated = "1";
  }, []);
  const {
    now,
    layout,
    setLayout,
    search,
    setSearch,
    category,
    setCategory,
    activeTags,
    toggleTag,
    clearTags,
    view,
    setView,
    starredKeys,
    visibleEvents,
    displayEvents,
    groups,
    categoryCounts,
    tagCounts,
    viewCounts,
    dueThisWeek,
    totalActive,
    starredCount,
    hasOthers,
    lastUpdatedDate,
    collapsedDates,
    toggleCollapsed,
    firstCollapsibleIdx,
    showCollapseHint,
    dismissCollapseHint,
  } = useEventListState(events, initialNowMs, initialFilters);

  const tagFilter = useMemo(
    () => ({ activeTags, onToggle: toggleTag }),
    [activeTags, toggleTag]
  );

  return (
    <TagFilterProvider value={tagFilter}>
      <Hero events={visibleEvents} starredKeys={starredKeys} now={now} />

      <div className="flex flex-col gap-2 px-5 pt-7 sm:flex-row sm:flex-wrap sm:items-center md:px-8">
        <SearchPill value={search} setValue={setSearch} />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            active={category}
            counts={categoryCounts}
            onSelect={setCategory}
          />
          <TagsFilter
            activeTags={activeTags}
            tagCounts={tagCounts}
            onToggle={toggleTag}
            onClear={clearTags}
          />
        </div>
      </div>

      <ViewTabs
        active={view}
        counts={viewCounts}
        onSelect={setView}
        trailing={
          <>
            <span className="hidden text-[13px] text-ink-3 lg:inline">
              sorted by next deadline ·{" "}
              <b className="font-medium text-ink-2">{dueThisWeek}</b> deadline
              {dueThisWeek === 1 ? "" : "s"} this week
            </span>
            <LayoutToggle layout={layout} setLayout={setLayout} />
          </>
        }
      />

      <div
        className={clsx(
          layout === "grid"
            ? "mt-4 grid grid-cols-1 gap-3 px-5 md:grid-cols-2 md:px-8 xl:grid-cols-3"
            : undefined
        )}
      >
        {displayEvents.length > 0 ? (
          layout === "grid" ? (
            displayEvents.map((e) => (
              <EventCard key={eventKey(e)} event={e} now={now} />
            ))
          ) : (
            groups.map((g, gi) => (
              <CollapsibleGroup
                key={g.key}
                group={g}
                isFirst={gi === 0}
                showHint={showCollapseHint && gi === firstCollapsibleIdx}
                onDismissHint={dismissCollapseHint}
                now={now}
                collapsed={g.date !== null && collapsedDates.has(g.date)}
                onToggle={
                  g.date ? () => toggleCollapsed(g.date as string) : undefined
                }
              />
            ))
          )
        ) : view === "starred" ? null : (
          <div className="px-5 py-8 text-[13px] text-ink-3 md:px-8">
            No events match these filters.
          </div>
        )}
      </div>

      {view === "starred" && (starredCount === 0 || hasOthers) && (
        <div className="mx-5 mt-8 flex flex-col items-start gap-4 border border-dashed border-rule p-5 sm:p-7 md:mx-8 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-6">
          <div className="text-[13px] text-ink-2">
            {starredCount === 0 ? (
              <>
                Nothing starred yet —{" "}
                <b className="font-semibold text-ink">{totalActive} events</b>{" "}
                tracked across conferences, workshops, and symposia. Tap the
                star icon on any row to follow it.
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
            onClick={() => setView("all")}
            className="inline-flex h-[38px] flex-shrink-0 items-center gap-2 rounded-pill bg-ink px-4 text-[13px] font-medium text-paper transition-colors hover:bg-[color:var(--accent)]"
          >
            Browse all events →
          </button>
        </div>
      )}

      <footer className="mt-14 flex items-center justify-between gap-4 border-t border-rule px-5 py-6 text-[12px] text-ink-3 md:px-8">
        <a
          href="https://github.com/cjohnson19/pl-conf"
          target="_blank"
          aria-label="Source on GitHub"
          className="inline-flex items-center gap-1.5 text-ink-3 no-underline transition-colors hover:text-ink"
          rel="noopener"
        >
          <Github size={13} strokeWidth={1.75} />
          <span>Source</span>
        </a>
        <span>
          {totalActive} events tracked
          {lastUpdatedDate && (
            <>
              {" "}
              · last updated <LastUpdated date={lastUpdatedDate} />
            </>
          )}
        </span>
      </footer>
    </TagFilterProvider>
  );
}
