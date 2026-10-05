import { Suspense } from "react";
import clsx from "clsx";
import { Github } from "lucide-react";
import { eventKey } from "../../lib/event";
import type { EventListView } from "../../lib/event-list-view";
import { ArchiveHeader } from "./archive-header";
import { ArchiveNote } from "./archive-note";
import { Hero } from "./heroes";
import { CollapsibleGroup } from "./group-display";
import { EventRow } from "../event-row";
import { LastUpdated } from "../last-updated";
import { LayoutSwitcher } from "./layout-switcher";
import { ListEmptyState } from "./list-empty-state";
import { ListFilterProvider } from "./list-filter";
import { NowProvider } from "./now-provider";
import { StarredEmptyState } from "./starred-empty-state";
import {
  FilterChips,
  LayoutToggle,
  SearchPill,
  TagsFilter,
  ViewTabs,
} from "./filters";

export function EventListShell({
  defaultQuery,
  archive,
  list,
  serverNowMs,
}: {
  defaultQuery: string;
  archive: boolean;
  list: EventListView;
  serverNowMs: number;
}) {
  const { displayEvents, heroEvents, groups, rows, liveKeys, counts } = list;
  const hasMultipleGroups = groups.length > 1;
  const serverNow = new Date(serverNowMs);

  return (
    <Suspense>
      <ListFilterProvider
        rows={rows}
        liveKeys={liveKeys}
        defaultQuery={defaultQuery}
        archive={archive}
      >
        <NowProvider initialMs={serverNowMs}>
          <Hero events={heroEvents} />

          <div className="flex flex-col gap-2 px-5 pt-7 sm:flex-row sm:flex-wrap sm:items-center md:px-8">
            <SearchPill />
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips counts={counts.categoryCounts} />
              <TagsFilter counts={counts.tagCounts} />
            </div>
          </div>

          {archive ? (
            <ArchiveHeader
              trailing={
                <>
                  <SortNote archive dueThisWeek={counts.dueThisWeek} />
                  <LayoutToggle />
                </>
              }
            />
          ) : (
            <ViewTabs
              counts={counts.viewCounts}
              trailing={
                <>
                  <SortNote archive={false} dueThisWeek={counts.dueThisWeek} />
                  <LayoutToggle />
                </>
              }
            />
          )}

          <LayoutSwitcher
            events={displayEvents}
            listChildren={groups.map((g, gi) => {
              // A dated heading already states the deadline, so its
              // rows drop their own date.
              const dated = g.heading.kind === "deadline";
              return (
                <CollapsibleGroup
                  key={g.key}
                  groupKey={g.key}
                  heading={g.heading}
                  groupKeys={g.events.map((e) => eventKey(e))}
                  isFirst={gi === 0}
                  showCollapseHint={gi === 0 && hasMultipleGroups}
                >
                  {g.events.map((e, i) => (
                    <div
                      key={eventKey(e)}
                      className={clsx(
                        "@container/row",
                        i === 0 && "[&>*]:border-t-0"
                      )}
                    >
                      <EventRow event={e} showDate={!dated} now={serverNow} />
                    </div>
                  ))}
                </CollapsibleGroup>
              );
            })}
          />

          <ListEmptyState />
          <StarredEmptyState totalActive={counts.totalActive} />
          {!archive && <ArchiveNote count={counts.viewCounts.archive} />}
        </NowProvider>
      </ListFilterProvider>
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
          {counts.totalActive} events tracked
          {list.lastUpdatedDate && (
            <>
              {" "}
              · last updated <LastUpdated date={list.lastUpdatedDate} />
            </>
          )}
        </span>
      </footer>
    </Suspense>
  );
}

function SortNote({
  archive,
  dueThisWeek,
}: {
  archive: boolean;
  dueThisWeek: number;
}) {
  return (
    <span className="hidden text-[13px] text-ink-3 lg:inline">
      {archive ? (
        "past events · most recent first"
      ) : (
        <>
          sorted by next deadline ·{" "}
          <b className="font-medium text-ink-2">{dueThisWeek}</b> deadline
          {dueThisWeek === 1 ? "" : "s"} this week
        </>
      )}
    </span>
  );
}
