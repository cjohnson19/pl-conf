import {
  dateNameToReadable,
  dateToString,
  DeadlineName,
  ScheduledEvent,
} from "../lib/event";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { TimeUntil } from "./time-until";

export function DateTable({
  importantDates,
}: {
  importantDates: ScheduledEvent["importantDates"];
}) {
  return Object.entries(importantDates).length === 0 ? null : (
    <>
      <h4>Dates & Deadlines</h4>
      <Table>
        <TableBody>
          {Object.entries(importantDates)
            .sort(([, a], [, b]) => a.localeCompare(b))
            .map(([k, v], i) => (
              <TableRow key={i}>
                <TableCell>{dateNameToReadable(k as DeadlineName)}</TableCell>
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
