import {
  dateNameToReadable,
  DateName,
  Round,
  ScheduledEvent,
} from "../lib/event";
import { LocaleDate } from "./locale-date";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { TimeUntil } from "./time-until";
import Link from "next/link";
import { isFuture, isPast } from "date-fns";
import { Info } from "lucide-react";
import { NotesTooltip } from "./notes-tooltip";

function roundHasDeadlines(r: Round) {
  return Object.keys(r.importantDates).length > 0;
}

function roundPassed(r: Round) {
  return Object.values(r.importantDates).every(isPast);
}

function nextActiveRoundIndex(rounds: Round[]): number | undefined {
  let bestIdx: number | undefined;
  let bestFirst: string | undefined;
  rounds.forEach((r, i) => {
    if (!roundHasDeadlines(r)) return;
    const dates = Object.values(r.importantDates);
    if (!dates.some(isFuture)) return;
    const first = dates.reduce((min, d) => (d < min ? d : min));
    if (bestFirst === undefined || first < bestFirst) {
      bestIdx = i;
      bestFirst = first;
    }
  });
  return bestIdx;
}

function DeadlineTable({ round }: { round: Round }) {
  return (
    <Table>
      <TableBody>
        {Object.entries(round.importantDates)
          .sort(([, a], [, b]) => a.localeCompare(b))
          .map(([k, v], i) => (
            <TableRow key={i}>
              <TableCell>{dateNameToReadable(k as DateName)}</TableCell>
              <TableCell>
                <span className="hidden sm:inline">
                  <LocaleDate date={v} style="long" aoe />
                </span>
                <span className="sm:hidden">
                  <LocaleDate date={v} style="compact" aoe />
                </span>
              </TableCell>
              <TableCell align="right" className="text-muted-foreground">
                <TimeUntil date={v} className="text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

export function DateTable({
  rounds,
  importantDateUrl,
  submissionSchemeUrl,
  notes,
}: {
  rounds: ScheduledEvent["rounds"];
  importantDateUrl: string | undefined;
  submissionSchemeUrl: string | undefined;
  notes: string[];
}) {
  const hasDeadlines = rounds.some(roundHasDeadlines);
  const isFlatShape =
    rounds.length === 0 ||
    (rounds.length === 1 && rounds[0].name === undefined);

  if (!hasDeadlines && importantDateUrl === undefined) return null;

  const header = importantDateUrl && (
    <div className="flex flex-row gap-2 items-center justify-start">
      <h4>
        <Link href={importantDateUrl} target="_blank">
          Dates & Deadlines
        </Link>
      </h4>
      {submissionSchemeUrl && (
        <Link
          href={submissionSchemeUrl}
          target="_blank"
          aria-label="Submission scheme explainer"
        >
          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Link>
      )}
      {notes.length > 0 && <NotesTooltip notes={notes} />}
    </div>
  );

  if (isFlatShape) {
    const round = rounds[0];
    return (
      <>
        {header}
        {hasDeadlines &&
          (roundPassed(round) ? (
            <small>All deadlines have passed</small>
          ) : (
            <DeadlineTable round={round} />
          ))}
      </>
    );
  }

  if (rounds.every(roundPassed)) {
    return (
      <>
        {header}
        <small>All deadlines have passed</small>
      </>
    );
  }

  const activeIdx = nextActiveRoundIndex(rounds);
  const defaultValue = activeIdx !== undefined ? [`round-${activeIdx}`] : [];

  return (
    <>
      {header}
      <Accordion type="multiple" defaultValue={defaultValue}>
        {rounds.map((round, i) => {
          const passed = roundHasDeadlines(round) && roundPassed(round);
          return (
            <AccordionItem key={i} value={`round-${i}`}>
              <AccordionTrigger
                className={passed ? "text-muted-foreground" : undefined}
              >
                <span>
                  {round.name ?? `Round ${i + 1}`}
                  {passed && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (passed)
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {roundHasDeadlines(round) ? (
                  <DeadlineTable round={round} />
                ) : (
                  <small className="text-muted-foreground">
                    No deadlines listed
                  </small>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
}
