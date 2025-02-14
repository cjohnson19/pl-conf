import { EventList } from "./components/event-list";
import { Resource } from "sst";

export default async function Home() {
  const events = Object.entries(Resource.EventList.events).map(([, e]) => e);

  return <EventList events={JSON.stringify(events)} />;
}
