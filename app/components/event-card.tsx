import { allDeadlines, ScheduledEvent, eventKey } from "../lib/event";
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
import clsx from "clsx";
import { FavoriteButton } from "./favorite-button";
import { EventTitleTooltip } from "./event-title-tooltip";
import { EventOptionsWrapper } from "./event-options-wrapper";
import { LocaleDate, LocaleDateRange } from "./locale-date";

export function EventCard({ e }: { e: ScheduledEvent }) {
  const year =
    e.date.start === "TBD"
      ? "TBD"
      : new Intl.DateTimeFormat("en-US", { year: "2-digit" }).format(
          new Date(e.date.start)
        );
  const abbrevYear = `${e.abbreviation} '${year}`;

  return (
    <Card className="w-full bg-muted/80 event-card">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-1 w-full">
          <CardTitle className="flex gap-2 justify-between items-start">
            <div className="flex gap-2 items-start justify-start flex-grow min-w-0">
              <EventTitleTooltip name={e.name}>
                <h3 className="truncate event-abbrev">
                  {e.url ? (
                    <Link href={e.url} target="_blank">
                      {abbrevYear}
                    </Link>
                  ) : (
                    abbrevYear
                  )}
                </h3>
              </EventTitleTooltip>
              <FavoriteButton prefKey={eventKey(e)} />
            </div>
            <div className="flex gap-2 items-center justify-end flex-shrink-0">
              <div className="flex flex-col gap-1 items-end">
                <p className="text-muted-foreground leading-none text-right text-xs sm:text-sm">
                  <span className="hidden sm:inline">
                    <LocaleDateRange
                      start={e.date.start}
                      end={e.date.end}
                      style="long"
                    />
                  </span>
                  <span className="sm:hidden">
                    <LocaleDateRange
                      start={e.date.start}
                      end={e.date.end}
                      style="compact"
                    />
                  </span>
                </p>
                <CardDescription>
                  <p className="text-muted-foreground leading-none text-right text-xs sm:text-sm">
                    {e.location}
                  </p>
                </CardDescription>
              </div>
              <EventOptionsWrapper e={e} />
            </div>
          </CardTitle>
          <div className="flex gap-4 items-center justify-between">
            <EventBadges tags={[e.type]} />
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={clsx("flex flex-col gap-4", {
          "p-0": allDeadlines(e).length === 0 && !e.importantDateUrl,
        })}
      >
        <DateTable
          rounds={e.rounds}
          importantDateUrl={e.importantDateUrl}
          submissionSchemeUrl={e.submissionSchemeUrl}
          notes={e.notes}
        />
      </CardContent>
      <CardFooter className="flex flex-col gap-0 items-end">
        <small className="text-muted-foreground">
          Updated <LocaleDate date={e.lastUpdated} style="short" />
        </small>
      </CardFooter>
    </Card>
  );
}
