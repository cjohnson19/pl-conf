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
import { DateTable } from "./date-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import clsx from "clsx";
import { format } from "date-fns";
import { FavoriteButton } from "./favorite-button";
import { EventOptions } from "./event-options/event-options";
import { PreferenceCollection } from "@/lib/event-prefs";
import { Dispatch, SetStateAction } from "react";

export function EventCard({
  e,
  prefs,
  setPrefs,
}: {
  e: ScheduledEvent;
  prefs: PreferenceCollection;
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
}) {
  return (
    <Card className="w-full bg-muted/80">
      <CardHeader>
        <div className="flex flex-col justify-between gap-1 w-full">
          <CardTitle className="flex gap-3 justify-between items-center">
            <div className="flex gap-2 items-start justify-start">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <h3>
                      {e.url ? (
                        <Link href={e.url}>{e.abbreviation}</Link>
                      ) : (
                        e.abbreviation
                      )}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent>{e.name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <FavoriteButton
                eventName={e.name}
                prefs={prefs}
                setPrefs={setPrefs}
              />
            </div>
            <div className="flex gap-2 items-center justify-end">
              <div className="flex flex-col gap-1 items-end">
                <p className="text-muted-foreground leading-none text-right">
                  {e.date.start === "TBD" ? (
                    "TBD"
                  ) : (
                    <>{dateToString(e.date.start)}</>
                  )}
                </p>
                <CardDescription>
                  <p className="text-muted-foreground leading-none text-right">
                    {e.location}
                  </p>
                </CardDescription>
              </div>
              <EventOptions e={e} prefs={prefs} setPrefs={setPrefs} />
            </div>
          </CardTitle>
          <div className="flex gap-4 items-center justify-between">
            <EventBadges tags={[e.type]} />
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={clsx("flex flex-col gap-4", {
          "p-0":
            Object.keys(e.importantDates).length === 0 && !e.importantDateUrl,
        })}
      >
        <DateTable
          importantDates={e.importantDates}
          url={e.importantDateUrl}
          notes={e.notes}
        />
      </CardContent>
      <CardFooter className="flex flex-col gap-0 items-end">
        <small className="text-muted-foreground">
          Updated {format(e.lastUpdated, "PP")}
        </small>
      </CardFooter>
    </Card>
  );
}
