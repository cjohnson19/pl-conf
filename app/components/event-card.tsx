import { ArrowUpRight } from "lucide-react";
import { dateToString, ScheduledEvent } from "../lib/event";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

export function EventCard({ e }: { e: ScheduledEvent }) {
  return (
    <Card className="w-full bg-muted/50">
      <CardHeader>
        <div className="flex flex-col justify-between gap-1 w-full">
          <CardTitle className="flex gap-8 justify-between items-center">
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <h3>
                    {e.url ? (
                      <div className="flex items-start justify-start gap-1 underline underline-offset-3">
                        <Link href={e.url}>{e.abbreviation}</Link>
                        <ArrowUpRight />
                      </div>
                    ) : (
                      e.abbreviation
                    )}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>{e.name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-muted-foreground leading-none mt-0">
              {dateToString(e.date.start)}
            </p>
          </CardTitle>
          <div className="flex gap-4 items-center justify-between">
            <EventBadges tags={[e.type]} />
            <CardDescription>
              <p className="text-muted-foreground leading-none mt-0">
                {e.location}
              </p>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <DeadlineTable deadlines={e?.deadlines ?? {}} />
      </CardContent>
      <CardFooter className="flex flex-col gap-0 items-start"></CardFooter>
    </Card>
  );
}
