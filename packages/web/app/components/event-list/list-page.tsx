import { events } from "@pl-conf/data";
import { eventPath } from "../../lib/event";
import { computeEventListView } from "../../lib/event-list-view";
import {
  parseFilterParams,
  type RawSearchParams,
} from "../../lib/filter-params";
import { serverNow as resolveServerNow } from "../../lib/server-now";
import { EventListShell } from "./event-list-shell";

const validEventPaths = new Set(Object.values(events).map((e) => eventPath(e)));

// The live list at `/` and the archive at `/archive/` differ only in which
// pool of events they show; the chips, tags and search apply to both.
export async function ListPage({
  searchParams,
  archive,
}: {
  searchParams: Promise<RawSearchParams>;
  archive: boolean;
}) {
  const parsed = parseFilterParams(await searchParams);
  const filters = archive ? { ...parsed, view: "archive" as const } : parsed;
  const serverNow = resolveServerNow();
  const view = computeEventListView(Object.values(events), filters, serverNow, {
    validEventPaths,
  });
  return (
    <EventListShell
      defaultQuery={filters.q}
      archive={archive}
      list={view}
      serverNowMs={serverNow.getTime()}
    />
  );
}
