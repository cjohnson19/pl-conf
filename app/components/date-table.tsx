import {
  dateNameToReadable,
  dateToString,
  DateName,
  ScheduledEvent,
} from "../lib/event";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { TimeUntil } from "./time-until";
import Link from "next/link";

export function DateTable({
  importantDates,
  url,
}: {
  importantDates: ScheduledEvent["importantDates"];
  url: string;
}) {
  return Object.entries(importantDates).length === 0 ? null : (
    <>
      <div className="flex gap-2 justify-start items-start">
        <h4>
          <Link href={url}>Dates & Deadlines</Link>
        </h4>
        {/* <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <h3>
                <Link href={url}>
                  <Globe size={15} />
                </Link>
              </h3>
            </TooltipTrigger>
            <TooltipContent>View page</TooltipContent>
          </Tooltip>
        </TooltipProvider> */}
      </div>
      <Table>
        <TableBody>
          {Object.entries(importantDates)
            .sort(([, a], [, b]) => a.localeCompare(b))
            .map(([k, v], i) => (
              <TableRow key={i}>
                <TableCell>{dateNameToReadable(k as DateName)}</TableCell>
                <TableCell>{dateToString(v)}</TableCell>
                <TableCell align="right">
                  <TimeUntil
                    date={v}
                    className="text-muted-foreground"
                  ></TimeUntil>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </>
  );
}
