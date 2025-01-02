import { EventList } from "./components/event-list";
import { Resource } from "sst";

export default async function Home() {
  const events = Object.entries(Resource.EventList.events)
    .map(([, e]) => e)
    .sort((a, b) =>
      a.date.start === "TBD"
        ? 1
        : b.date.start === "TBD"
        ? -1
        : a.date.start.localeCompare(b.date.start),
    );

  return <EventList events={JSON.stringify(events)} />;
}
