import { EventListContainer } from "./components/event-list-container";
import { events } from "@generated";
import { ScheduledEvent } from "./lib/event";
import { isAfter } from "date-fns";
import { sortByEventDate } from "./lib/event-sorter";

function isActive(e: ScheduledEvent): boolean {
  return e.date.end !== "TBD" && isAfter(e.date.end, new Date());
}

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
