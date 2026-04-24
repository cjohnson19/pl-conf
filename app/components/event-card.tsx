import {
  allDeadlines,
  formatDate,
  ScheduledEvent,
  eventKey,
} from "../lib/event";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import Link from "next/link";
import { DateTable } from "./date-table";
import clsx from "clsx";
import { FavoriteButton } from "./favorite-button";
import { EventTitleTooltip } from "./event-title-tooltip";
import { EventOptionsWrapper } from "./event-options-wrapper";
import { LocaleDateRange } from "./locale-date";
import { LastUpdated } from "./last-updated";
import { capitalize } from "../lib/utils";
import { ArrowUpRight } from "lucide-react";

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/50">
      ·
    </span>
  );
}

export function EventCard({ e }: { e: ScheduledEvent }) {
  const abbrevYear = `${e.abbreviation} '${formatDate(e.date.start, "year2", "en-US")}`;
  const hasRelationships = e.partOf.length > 0 || e.colocatedWith.length > 0;
  const hasDeadlineSection = allDeadlines(e).length > 0 || !!e.importantDateUrl;

  return (
    <Card className="bg-muted/60 event-card flex flex-col h-full">
      <CardHeader className="p-4 pb-3 gap-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <EventTitleTooltip name={e.name}>
              <CardTitle className="event-abbrev leading-tight">
                {e.url ? (
                  <Link
                    href={e.url}
                    target="_blank"
                    className="no-underline hover:underline inline-flex items-center gap-0.5 group"
                  >
                    {abbrevYear}
                    <ArrowUpRight
                      className="h-4 w-4 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  abbrevYear
                )}
              </CardTitle>
            </EventTitleTooltip>
            <Badge variant="secondary" className="font-medium">
              {capitalize(e.type)}
            </Badge>
          </div>
          <div className="flex items-center shrink-0 -mr-2 -mt-1">
            <FavoriteButton prefKey={eventKey(e)} />
            <EventOptionsWrapper e={e} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm text-muted-foreground">
          <span>
            <LocaleDateRange
              start={e.date.start}
              end={e.date.end}
              style="short"
            />
          </span>
          {e.location && (
            <>
              <Dot />
              <span className="truncate">{e.location}</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent
        className={clsx("px-4 pb-3 pt-0 flex flex-col gap-3 flex-1", {
          hidden: !hasDeadlineSection,
        })}
      >
        <DateTable
          rounds={e.rounds}
          importantDateUrl={e.importantDateUrl}
          notes={e.notes}
        />
      </CardContent>

      <CardFooter className="px-4 py-2 mt-auto flex flex-wrap items-center gap-x-3 gap-y-1">
        {hasRelationships && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            {e.partOf.length > 0 && (
              <>
                <span>Part of</span>
                {e.partOf.map((ref) => (
                  <Badge
                    key={ref}
                    variant="outline"
                    className="font-normal bg-background/60"
                  >
                    {ref}
                  </Badge>
                ))}
              </>
            )}
            {e.partOf.length > 0 && e.colocatedWith.length > 0 && <Dot />}
            {e.colocatedWith.length > 0 && (
              <>
                <span>Co-located with</span>
                {e.colocatedWith.map((ref) => (
                  <Badge
                    key={ref}
                    variant="outline"
                    className="font-normal bg-background/60"
                  >
                    {ref}
                  </Badge>
                ))}
              </>
            )}
          </div>
        )}
        <small className="text-muted-foreground ml-auto text-xs">
          Updated <LastUpdated date={e.lastUpdated} />
        </small>
      </CardFooter>
    </Card>
  );
}
