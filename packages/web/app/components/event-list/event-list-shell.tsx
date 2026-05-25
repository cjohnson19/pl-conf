import { Suspense } from "react";
import clsx from "clsx";
import { Github } from "lucide-react";
import { eventKey } from "../../lib/event";
import type { FilterParams } from "../../lib/filter-params";
import type { EventListView } from "../../lib/event-list-view";
import { Hero } from "./heroes";
import { CollapsibleGroup } from "./group-display";
import { EventRow } from "../event-row";
import { LastUpdated } from "../last-updated";
import { HydrationMarker } from "./hydration-marker";
import { LayoutSwitcher } from "./layout-switcher";
import { NowProvider } from "./now-provider";
import { StarredCount } from "./starred-count";
import { StarredEmptyState } from "./starred-empty-state";
import { UrlTagFilterProvider } from "./url-tag-filter-provider";
import { VisibilityStyle } from "./visibility-style";
import {
  FilterChips,
  LayoutToggle,
  SearchPill,
  TagsFilter,
  ViewTabs,
} from "./filters";

export function EventListShell({
  filters,
  view,
  serverNowMs,
}: {
  filters: FilterParams;
  view: EventListView;
  serverNowMs: number;
}) {
  const serverNow = new Date(serverNowMs);
  const {
    displayEvents,
    heroEvents,
    groups,
    categoryCounts,
    tagCounts,
    viewCounts,
    dueThisWeek,
    totalActive,
    lastUpdatedDate,
  } = view;
  const firstCollapsibleIdx = groups.findIndex((g) => g.date !== null);
  const hasMultipleGroups = groups.length > 1;

  return (
    <Suspense>
      <UrlTagFilterProvider>
        <NowProvider initialMs={serverNowMs}>
          <HydrationMarker />
          <VisibilityStyle />
          <Hero events={heroEvents} />

          <div className="flex flex-col gap-2 px-5 pt-7 sm:flex-row sm:flex-wrap sm:items-center md:px-8">
            <SearchPill defaultValue={filters.q} />
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips counts={categoryCounts} />
              <TagsFilter tagCounts={tagCounts} />
            </div>
          </div>

          <ViewTabs
            counts={viewCounts}
            starredCountSlot={<StarredCount displayEvents={displayEvents} />}
            trailing={
              <>
                <span className="hidden text-[13px] text-ink-3 lg:inline">
                  sorted by next deadline ·{" "}
                  <b className="font-medium text-ink-2">{dueThisWeek}</b>{" "}
                  deadline
                  {dueThisWeek === 1 ? "" : "s"} this week
                </span>
                <LayoutToggle />
              </>
            }
          />

          <LayoutSwitcher
            events={displayEvents}
            serverNowMs={serverNowMs}
            listChildren={
              displayEvents.length > 0 ? (
                groups.map((g, gi) => (
                  <CollapsibleGroup
                    key={g.key}
                    groupKey={g.key}
                    groupDate={g.date}
                    groupKeys={g.events.map((e) => eventKey(e))}
                    count={g.events.length}
                    isFirst={gi === 0}
                    isFirstCollapsible={
                      gi === firstCollapsibleIdx && hasMultipleGroups
                    }
                  >
                    {g.events.map((e, i) => (
                      <div
                        key={eventKey(e)}
                        className={clsx(
                          "@container/row",
                          i === 0 && "[&>*]:border-t-0"
                        )}
                      >
                        <EventRow
                          event={e}
                          now={serverNow}
                          hideDate={g.date !== null}
                        />
                      </div>
                    ))}
                  </CollapsibleGroup>
                ))
              ) : filters.view === "starred" ? null : (
                <div className="px-5 py-8 text-[13px] text-ink-3 md:px-8">
                  No events match these filters.
                </div>
              )
            }
          />

          {filters.view === "starred" && (
            <StarredEmptyState totalActive={totalActive} />
          )}
        </NowProvider>
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
      </UrlTagFilterProvider>
    </Suspense>
  );
}
