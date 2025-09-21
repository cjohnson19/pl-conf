import {
  dateNameToReadable,
  dateToString,
  DateName,
  ScheduledEvent,
} from "../lib/event";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { TimeUntil } from "./time-until";
import Link from "next/link";
import { isPast } from "date-fns";
import { NotesTooltip } from "./notes-tooltip";

function hasDeadlines(importantDates: ScheduledEvent["importantDates"]) {
  return Object.keys(importantDates).length > 0;
}

function allDeadlinesPassed(importantDates: ScheduledEvent["importantDates"]) {
  return Object.values(importantDates).every((d) => isPast(d));
}

export function DateTable({
  importantDates,
  url,
  notes,
}: {
  importantDates: ScheduledEvent["importantDates"];
  url: string | undefined;
  notes: string[];
}) {
  return !hasDeadlines(importantDates) && url === undefined ? null : (
    <>
      <div className="flex gap-2 justify-start items-start">
        {url && (
          <div className="flex flex-row gap-2 items-center justify-start">
            <h4 className="text-base sm:text-lg md:text-xl">
              <Link href={url} target="_blank">
                Dates & Deadlines
              </Link>
            </h4>
            {notes.length > 0 && <NotesTooltip notes={notes} />}
          </div>
        )}
      </div>
      {hasDeadlines(importantDates) && allDeadlinesPassed(importantDates) ? (
        <small>All deadlines have passed</small>
      ) : (
        <Table>
          <TableBody>
            {Object.entries(importantDates)
              .sort(([, a], [, b]) => a.localeCompare(b))
              .map(([k, v], i) => (
                <TableRow key={i}>
                  <TableCell>{dateNameToReadable(k as DateName)}</TableCell>
                  <TableCell>{dateToString(v)}</TableCell>
                  <TableCell align="right" className="text-muted-foreground">
                    <TimeUntil
                      date={v}
                      className="text-muted-foreground"
                    ></TimeUntil>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
