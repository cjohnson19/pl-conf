import { dateToString, ScheduledEvent } from "../lib/event";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { capitalize } from "../lib/utils";
import { TimeUntil } from "./time-until";

export function DeadlineTable({
  deadlines,
}: {
  deadlines: ScheduledEvent["deadlines"];
}) {
  return Object.entries(deadlines).length === 0 ? null : (
    <>
      <h4>Deadlines</h4>
      <Table>
        <TableBody>
          {Object.entries(deadlines)
            .sort(([, a], [, b]) => a.localeCompare(b))
            .map(([k, v], i) => (
              <TableRow key={i}>
                <TableCell>{capitalize(k)}</TableCell>
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
