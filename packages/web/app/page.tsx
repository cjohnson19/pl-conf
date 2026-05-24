import { EventListContainer } from "./components/event-list-container";
import { events } from "@pl-conf/data";
import { isActive } from "./lib/event-filter";
import { sortByEventDate } from "./lib/event-sorter";

export const revalidate = 60;

export default async function Home() {
  const activeEvents = Object.values(events)
    .filter(isActive)
    .sort(sortByEventDate);
  return <EventListContainer events={activeEvents} initialNowMs={Date.now()} />;
}
