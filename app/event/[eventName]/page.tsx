import { format } from "date-fns";
import { TimeUntil } from "../../components/time-until";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/components/calendar-event";
import { Resource } from "sst";

export default async function Page({
  params,
}: {
  params: Promise<{ eventName: string }>;
}) {
  const event =
    Resource.EventList.events[
      (await params).eventName as keyof typeof Resource.EventList.events
    ];

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
            <TimeUntil
              date={event.date.start}
              className="text-muted-foreground leading-none mt-0"
            />
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
  return Object.entries(Resource.EventList.events).map(([, e]) => ({
    eventName: e.abbreviation,
  }));
}
