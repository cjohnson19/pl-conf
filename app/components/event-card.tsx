import { dateRangeToString, dateRangeToCompactString, ScheduledEvent } from "../lib/event";
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
import { eventKey, PreferenceCollection } from "@/lib/user-prefs";
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
  const abbrevYear = (
    <>
      {e.abbreviation} &apos;{format(e.date.start, "yy")}
    </>
  );
  return (
    <Card className="w-full bg-muted/80">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-1 w-full">
          <CardTitle className="flex gap-2 justify-between items-start">
            <div className="flex gap-2 items-start justify-start flex-grow min-w-0">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <h3 className="text-base sm:text-lg md:text-xl truncate">
                      {e.url ? (
                        <Link href={e.url} target="_blank">{abbrevYear}</Link>
                      ) : (
                        abbrevYear
                      )}
                    </h3>
                  </TooltipTrigger>
                  <TooltipContent>{e.name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <FavoriteButton
                prefKey={eventKey(e)}
                prefs={prefs}
                setPrefs={setPrefs}
              />
            </div>
            <div className="flex gap-2 items-center justify-end flex-shrink-0">
              <div className="flex flex-col gap-1 items-end">
                <p className="text-muted-foreground leading-none text-right text-xs sm:text-sm">
                  <span className="hidden sm:inline">
                    {dateRangeToString(e.date.start, e.date.end)}
                  </span>
                  <span className="sm:hidden">
                    {dateRangeToCompactString(e.date.start, e.date.end)}
                  </span>
                </p>
                <CardDescription>
                  <p className="text-muted-foreground leading-none text-right text-xs sm:text-sm">
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
