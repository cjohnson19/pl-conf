import { Calendar, Globe } from "lucide-react";
import { dateToString, ScheduledEvent } from "../lib/event";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import Link from "next/link";
import { EventBadges } from "./event-badges";
import { DeadlineTable } from "./deadline-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { CalendarEvent } from "./calendar-event";
import { Button } from "./ui/button";
import clsx from "clsx";

export function EventCard({ e }: { e: ScheduledEvent }) {
  return (
    <Card className="w-full bg-muted/50">
      <CardHeader>
        <div className="flex flex-col justify-between gap-1 w-full">
          <CardTitle className="flex gap-8 justify-between items-center">
            <div className="flex gap-2 items-start">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <h3>
                      <Link href={`/event/${e.abbreviation}`}>
                        {e.abbreviation}
                      </Link>
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent>{e.name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {e.url ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <h3>
                        <Link href={e.url}>
                          <Globe size={20} />
                        </Link>
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>Visit page</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
            <div className="flex gap-2 items-center justify-start">
              <div className="flex flex-col gap-1 items-end">
                <p className="text-muted-foreground leading-none">
                  {e.date.start === "TBD" ? (
                    "TBD"
                  ) : (
                    <>{dateToString(e.date.start)}</>
                  )}
                </p>
                <CardDescription>
                  <p className="text-muted-foreground leading-none">
                    {e.location}
                  </p>
                </CardDescription>
              </div>
              <CalendarEvent e={e}>
                <Button variant={"ghost"} size={"icon"}>
                  <Calendar className="text-muted-foreground" />
                </Button>
              </CalendarEvent>
            </div>
          </CardTitle>
          <div className="flex gap-4 items-center justify-between">
            <EventBadges tags={[e.type]} />
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={clsx("flex flex-col gap-4", {
          "p-0": Object.keys(e.deadlines).length === 0,
        })}
      >
        <DeadlineTable deadlines={e.deadlines} />
      </CardContent>
      {/* <CardFooter className="flex flex-col gap-0 items-start"></CardFooter> */}
    </Card>
  );
}
