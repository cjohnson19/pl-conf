import { events } from "@pl-conf/data";
import { EventListShell } from "./components/event-list/event-list-shell";
import { eventPath } from "./lib/event";
import { computeEventListView } from "./lib/event-list-view";
import { parseFilterParams, type RawSearchParams } from "./lib/filter-params";

const validEventPaths = new Set(Object.values(events).map((e) => eventPath(e)));

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseFilterParams(await searchParams);
  const serverNow = new Date();
  const view = computeEventListView(Object.values(events), filters, serverNow, {
    validEventPaths,
  });
  return (
    <EventListShell
      filters={filters}
      view={view}
      serverNowMs={serverNow.getTime()}
    />
  );
}
