import clsx from "clsx";
import type { DisplayEvent } from "../../lib/event-list-view";
import { dateNameShort } from "../../lib/date-formatters";
import { type RoundSlot, type RoundSlots, pickRailSlots } from "./rail-slots";
import { type RailRow, buildRoundRows, deadlineToneClass } from "./shared";
import { LocalDate } from "../local-date";

export function RoundRail({
  event: e,
  now,
}: {
  event: DisplayEvent;
  now: Date;
}) {
  const slots = pickRailSlots(e, now);
  if (slots) return <MultiRoundRail event={e} slots={slots} now={now} />;
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
      <span className={clsx("font-mono text-[11px]", deadlineToneClass(r))}>
        <LocalDate date={r.date} style="monthDay" />
      </span>
    </div>
  );
}

function MultiRoundRail({
  event: e,
  slots: { left, right },
  now,
}: {
  event: DisplayEvent;
  slots: RoundSlots;
  now: Date;
}) {
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
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 border-l-2 pl-2.5",
        active ? "border-hot" : "border-rule"
      )}
    >
      <div
        className={clsx(
          "flex items-baseline gap-2 font-mono text-[10px] font-medium tracking-[0.08em]",
          active ? "text-hot" : "text-ink-3"
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
