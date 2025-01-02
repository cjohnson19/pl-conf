import { fromYaml, ScheduledEvent } from "@/lib/event";
import { format } from "date-fns";
import { readFile } from "node:fs/promises";
import { TimeUntil } from "./time-until";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/components/calendar-event";

const res = await readFile(process.cwd() + "/data/conf.yaml", "utf8");
const es = fromYaml(res);
const events = Object.fromEntries(
  es.map((e: ScheduledEvent) => [e.abbreviation, e]),
);

export default async function Page({
  params,
}: {
  params: Promise<{ eventName: string }>;
}) {
  const event = events[(await params).eventName];

  return (
    <div className="flex flex-col gap-4 items-start px-8">
      <h1 className="w-full">{event.abbreviation}</h1>
      <h3>{event.name}</h3>
      <Separator orientation="horizontal" />

      {event.date.start === "TBD" || event.date.end === "TBD" ? (
        <h3>TBD</h3>
      ) : (
        <>
          <div className="flex flex-row justify-between w-full items-center">
            <div className="flex flex-row gap-4">
              <h3>
                {format(event.date.start, "PPP")} -{" "}
                {format(event.date.end, "PPP")}
              </h3>
            </div>
            <TimeUntil date={event.date.start} />
          </div>
          <CalendarEvent e={event}>
            <Button variant={"outline"}>Add to calendar</Button>
          </CalendarEvent>
        </>
      )}
      <h3></h3>
    </div>
  );
}

export async function generateStaticParams() {
  return es.map((e: ScheduledEvent) => ({
    eventName: e.abbreviation,
  }));
}
