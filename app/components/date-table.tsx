import {
  dateNameToReadable,
  dateToString,
  DateName,
  Round,
  ScheduledEvent,
} from "../lib/event";
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

function allRoundsPassed(rounds: Round[]) {
  return rounds.every((r) =>
    Object.values(r.importantDates).every((d) => isPast(d))
  );
}

function roundFirstDeadline(r: Round): string | undefined {
  return Object.values(r.importantDates).sort()[0];
}

function nextActiveRoundIndex(rounds: Round[]): number | undefined {
  const candidates = rounds
    .map((r, i) => ({ r, i, first: roundFirstDeadline(r) }))
    .filter(
      ({ r }) =>
        roundHasDeadlines(r) &&
        Object.values(r.importantDates).some((d) => isFuture(d))
    )
    .sort((a, b) => (a.first ?? "").localeCompare(b.first ?? ""));
  return candidates[0]?.i;
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
              <TableCell>{dateToString(v)}</TableCell>
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
    <div className="flex gap-2 justify-start items-start">
      <div className="flex flex-row gap-2 items-center justify-start">
        <h4 className="text-base sm:text-lg md:text-xl">
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
    </div>
  );

  if (isFlatShape) {
    const round = rounds[0];
    const body =
      hasDeadlines && round && allRoundsPassed([round]) ? (
        <small>All deadlines have passed</small>
      ) : round ? (
        <DeadlineTable round={round} />
      ) : null;
    return (
      <>
        {header}
        {body}
      </>
    );
  }

  if (allRoundsPassed(rounds)) {
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
          const passed = roundHasDeadlines(round) && allRoundsPassed([round]);
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
