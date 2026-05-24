import { events } from "@pl-conf/data";
import { EventListContainer } from "./components/event-list-container";
import { isActive } from "./lib/event-filter";
import { sortByEventDate } from "./lib/event-sorter";
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
  const initialFilters = parseFilterParams(await searchParams);
  return (
    <EventListContainer
      events={activeEvents}
      initialNowMs={Date.now()}
      initialFilters={initialFilters}
    />
  );
}
