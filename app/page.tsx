import { readFile } from "fs/promises";
import { EventList } from "./components/event-list";
import { fromYaml } from "./lib/event";

export default async function Home() {
  const res = await readFile(process.cwd() + "/data/conf.yaml", "utf8");
  const events = fromYaml(res).sort((a, b) =>
    a.date.start === "TBD"
      ? 1
      : b.date.start === "TBD"
      ? -1
      : a.date.start.getTime() - b.date.start.getTime(),
  );

  return <EventList events={JSON.stringify(events)} />;
}
