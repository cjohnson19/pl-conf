import { EventListContainer } from "./components/event-list-container";
import { events } from "@generated";
import { isActive } from "./lib/event-filter";
import { sortByEventDate } from "./lib/event-sorter";

export default async function Home() {
  const eventList = Object.entries(events).map(([, e]) => e);

  const activeEvents = eventList.filter(isActive).sort(sortByEventDate);

  const eventYears = [
    ...new Set(
      eventList
        .filter((e) => e.date.start !== "TBD")
        .map((e) => new Date(e.date.start).getFullYear().toString())
    ),
  ];

  return <EventListContainer events={activeEvents} eventYears={eventYears} />;
}
