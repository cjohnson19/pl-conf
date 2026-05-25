import { events } from "@pl-conf/data";
import { EventListShell } from "./components/event-list/event-list-shell";
import { isActive } from "./lib/event-filter";
import { computeEventListView } from "./lib/event-list-view";
import { parseFilterParams, type RawSearchParams } from "./lib/filter-params";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const activeEvents = Object.values(events).filter(isActive);
  const filters = parseFilterParams(await searchParams);
  const serverNow = new Date();
  const view = computeEventListView(activeEvents, filters, serverNow);
  return (
    <EventListShell
      filters={filters}
      view={view}
      serverNowMs={serverNow.getTime()}
    />
  );
}
