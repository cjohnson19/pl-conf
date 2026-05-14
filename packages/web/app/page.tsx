import { EventListContainer } from "./components/event-list-container";
import { events } from "@pl-conf/data";
import { isActive } from "./lib/event-filter";
import { sortByEventDate } from "./lib/event-sorter";

export default async function Home() {
  const eventList = Object.entries(events).map(([, e]) => e);
  const activeEvents = eventList.filter(isActive).sort(sortByEventDate);
  return <EventListContainer events={activeEvents} />;
}
