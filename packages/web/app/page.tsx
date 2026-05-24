import { events } from "@pl-conf/data";
import { EventListShell } from "./components/event-list/event-list-shell";
import { isActive } from "./lib/event-filter";
import { sortByEventDate } from "./lib/event-sorter";
import { computeEventListView } from "./lib/event-list-view";
import { parseFilterParams, type RawSearchParams } from "./lib/filter-params";

export const revalidate = 60;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const activeEvents = Object.values(events)
    .filter(isActive)
    .sort(sortByEventDate);
  const filters = parseFilterParams(await searchParams);
  const serverNow = new Date();
  const view = computeEventListView(activeEvents, filters, serverNow);
  return (
    <EventListShell
      filters={filters}
      view={view}
      activeEvents={activeEvents}
      serverNowMs={serverNow.getTime()}
    />
  );
}
