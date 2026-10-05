"use client";

import clsx from "clsx";
import { type Round, roundsWithDates } from "../../lib/event";
import { dateNameShort } from "../../lib/date-formatters";
import { LocalDate } from "../local-date";
import { shortCountdown } from "../../lib/countdown";
import { useNow } from "../event-list/now-provider";
import {
  buildRoundRows,
  deadlineToneClass,
  roundLabel,
} from "../event-row/shared";

export function EventDeadlines({ rounds }: { rounds: Round[] }) {
  const now = useNow();
  const deadlineRounds = roundsWithDates(rounds);
  if (deadlineRounds.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {deadlineRounds.map((round, idx) => {
        const rows = buildRoundRows(round, now);
        if (rows.length === 0) return null;
        return (
          <div key={round.name ?? idx} className="flex flex-col gap-3">
            {deadlineRounds.length > 1 && (
              <div className="font-mono text-[11px] font-medium tracking-[0.06em] text-ink-3">
                {roundLabel(round, idx)}
              </div>
            )}
            <ul className="flex flex-col">
              {rows.map((r) => {
                const next = r.kind === "next";
                const past = r.kind === "past";
                return (
                  <li key={r.name} className="flex items-baseline gap-3 py-2.5">
                    <span
                      className={clsx(
                        "shrink-0 text-[14px]",
                        next
                          ? "font-medium text-ink"
                          : past
                            ? "text-ink-3"
                            : "text-ink-2"
                      )}
                    >
                      {dateNameShort(r.name)}
                    </span>
                    <span
                      aria-hidden
                      className="min-w-6 flex-1 translate-y-[-0.28rem] border-b border-dotted border-rule"
                    />
                    <span
                      className={clsx(
                        "shrink-0 font-mono text-[13px] tabular-nums",
                        next ? "text-ink" : "text-ink-2"
                      )}
                    >
                      <LocalDate date={r.date} style="monthDay" />
                    </span>
                    <span className="flex w-20 shrink-0 items-baseline gap-2">
                      {r.date !== "TBD" && (
                        <>
                          <span
                            aria-hidden
                            className="min-w-3 flex-1 translate-y-[-0.28rem] border-b border-dotted border-rule"
                          />
                          <span
                            className={clsx(
                              "whitespace-nowrap font-mono text-[11px]",
                              deadlineToneClass(r)
                            )}
                            suppressHydrationWarning
                          >
                            {shortCountdown(r.date, now)}
                          </span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
