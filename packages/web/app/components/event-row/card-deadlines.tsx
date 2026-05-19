import clsx from "clsx";
import type { DateName, Round } from "../../lib/event";
import { dateNameShort, roundShortDate } from "../../lib/date-formatters";
import { shortCountdown } from "../../lib/countdown";
import { type RailRow, buildRoundRows } from "./shared";

export function CardDeadlineTable({
  round,
  roundIndex,
  showRoundLabel,
  activeName,
  now,
}: {
  round: Round;
  roundIndex: number;
  showRoundLabel: boolean;
  activeName: DateName | undefined;
  now: Date;
}) {
  const rows = buildRoundRows(round, now, activeName);
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {showRoundLabel && (
        <div className="text-[10px] font-medium tracking-[0.06em] text-ink-3">
          {round.name ?? `Round ${roundIndex + 1}`}
        </div>
      )}
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {rows.map((r) => (
            <CardDeadlineRow key={r.name} row={r} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardDeadlineRow({ row: r, now }: { row: RailRow; now: Date }) {
  const next = r.kind === "next";
  return (
    <tr>
      <td
        className={clsx(
          "py-1 pr-2 align-baseline",
          next && "font-medium text-ink"
        )}
      >
        {dateNameShort(r.name)}
      </td>
      <td
        className={clsx(
          "py-1 pr-2 align-baseline whitespace-nowrap font-mono",
          next ? "text-ink" : "text-ink-3"
        )}
      >
        {r.date === "TBD" ? "TBD" : roundShortDate(r.date)}
      </td>
      <td
        className={clsx(
          "py-1 text-right align-baseline whitespace-nowrap font-mono text-[11px]",
          next
            ? r.urgent
              ? "text-hot"
              : "text-[color:var(--accent)]"
            : "text-ink-3"
        )}
      >
        {r.date === "TBD" ? "" : shortCountdown(r.date, now)}
      </td>
    </tr>
  );
}
