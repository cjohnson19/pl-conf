import { EventList } from "./components/event-list";
import { events } from "@generated";

export default async function Home() {
  const eventList = Object.entries(events).map(([, e]) => e);

  return <EventList events={JSON.stringify(eventList)} />;
}
