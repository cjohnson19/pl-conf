import clsx from "clsx";
import type { DisplayEvent } from "../../lib/event-list-view";
import { roundStatuses } from "../../lib/deadline";
import { dateNameShort, roundShortDate } from "../../lib/date-formatters";
import { type RoundSlot, pickMultiRoundSlots } from "./rail-slots";
import { type RailRow, buildRoundRows, deadlineToneClass } from "./shared";

export function RoundRail({
  event: e,
  now,
  showMultiRound,
}: {
  event: DisplayEvent;
  now: Date;
  showMultiRound: boolean;
}) {
  if (showMultiRound) {
    return <MultiRoundRail event={e} now={now} />;
  }
  return <SingleRoundRail event={e} now={now} />;
}

function SingleRoundRail({
  event: e,
  now,
}: {
  event: DisplayEvent;
  now: Date;
}) {
  const round = e.rounds[0];
  if (!round) return null;
  const rows = buildRoundRows(round, now);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 flex max-w-xs flex-col gap-1 border-l-2 border-rule pl-2.5">
      {rows.map((r) => (
        <DateRow key={r.name} row={r} />
      ))}
    </div>
  );
}

function DateRow({ row: r }: { row: RailRow }) {
  return (
    <div
      className={clsx(
        "grid grid-cols-[1fr_auto] gap-2 text-[12px]",
        r.kind === "next" ? "font-medium text-ink" : "text-ink-2"
      )}
    >
      <span>{dateNameShort(r.name)}</span>
      <span
        className={clsx("font-mono text-[11px]", deadlineToneClass(r))}
        suppressHydrationWarning
      >
        {roundShortDate(r.date)}
      </span>
    </div>
  );
}

function MultiRoundRail({ event: e, now }: { event: DisplayEvent; now: Date }) {
  const { left, right } = pickMultiRoundSlots(roundStatuses(e, now));
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {left ? <RoundColumn event={e} slot={left} now={now} /> : <div />}
      <RoundColumn event={e} slot={right} now={now} />
    </div>
  );
}

function RoundColumn({
  event: e,
  slot,
  now,
}: {
  event: DisplayEvent;
  slot: RoundSlot;
  now: Date;
}) {
  const round = e.rounds[slot.idx];
  if (!round) return <div />;
  const active = slot.status === "active";
  const rows = buildRoundRows(round, now, active);
  const urgent = active && rows.some((r) => r.kind === "next" && r.urgent);
  const accentClass = urgent ? "text-hot" : "text-accent";
  const borderClass = urgent ? "border-hot" : "border-accent";
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 border-l-2 pl-2.5",
        active ? borderClass : "border-rule"
      )}
    >
      <div
        className={clsx(
          "flex items-baseline gap-2 font-mono text-[10px] font-medium tracking-[0.08em]",
          active ? accentClass : "text-ink-3"
        )}
      >
        Round {slot.idx + 1}
        <span
          className="rounded-xs border px-1 py-px text-[9px]"
          style={{ borderColor: "currentColor" }}
        >
          {slot.status}
        </span>
      </div>
      {rows.map((r) => (
        <DateRow key={r.name} row={r} />
      ))}
    </div>
  );
}
