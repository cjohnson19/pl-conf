import { events } from "@pl-conf/data";
import { EventListShell } from "./components/event-list/event-list-shell";
import { eventPath } from "./lib/event";
import { computeEventListView } from "./lib/event-list-view";
import { parseFilterParams, type RawSearchParams } from "./lib/filter-params";
import { serverNow as resolveServerNow } from "./lib/server-now";

const validEventPaths = new Set(Object.values(events).map((e) => eventPath(e)));

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseFilterParams(await searchParams);
  const serverNow = resolveServerNow();
  const view = computeEventListView(Object.values(events), filters, serverNow, {
    validEventPaths,
  });
  return (
    <EventListShell
      defaultQuery={filters.q}
      view={view}
      serverNowMs={serverNow.getTime()}
    />
  );
}
