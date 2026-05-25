import clsx from "clsx";
import type { DateName } from "../../lib/event";
import type { DisplayEvent } from "../../lib/event-list-view";
import {
  type NextDeadline,
  type RoundSlotStatus,
  pickMultiRoundSlots,
} from "../../lib/deadline";
import { dateNameShort, roundShortDate } from "../../lib/date-formatters";
import { type RailRow, buildRoundRows } from "./shared";

export function RoundRail({
  event: e,
  now,
  lead,
  passed,
  showMultiRound,
  totalRounds,
}: {
  event: DisplayEvent;
  now: Date;
  lead: NextDeadline | null;
  passed: boolean;
  showMultiRound: boolean;
  totalRounds: number;
}) {
  if (showMultiRound) {
    return (
      <MultiRoundRail
        event={e}
        now={now}
        activeRoundIdx={lead?.roundIdx ?? totalRounds - 1}
        activeNext={lead?.name}
      />
    );
  }
  return (
    <SingleRoundRail
      event={e}
      now={now}
      activeNext={passed ? undefined : lead?.name}
    />
  );
}

function SingleRoundRail({
  event: e,
  now,
  activeNext,
}: {
  event: DisplayEvent;
  now: Date;
  activeNext?: DateName;
}) {
  const round = e.rounds[0];
  const rows = round ? buildRoundRows(round, now, activeNext) : [];
  if (!round) return null;
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
        className={clsx(
          "font-mono text-[11px]",
          r.kind === "next"
            ? r.urgent
              ? "text-hot"
              : "text-[color:var(--accent)]"
            : "text-ink-3"
        )}
        suppressHydrationWarning
      >
        {r.date === "TBD" ? "TBD" : roundShortDate(r.date)}
      </span>
    </div>
  );
}

function MultiRoundRail({
  event: e,
  now,
  activeRoundIdx,
  activeNext,
}: {
  event: DisplayEvent;
  now: Date;
  activeRoundIdx: number;
  activeNext?: DateName;
}) {
  const { left, right } = pickMultiRoundSlots(e.rounds.length, activeRoundIdx);
  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {left ? (
        <RoundColumnContainer
          event={e}
          slot={left}
          now={now}
          activeNext={activeNext}
        />
      ) : (
        <div />
      )}
      <RoundColumnContainer
        event={e}
        slot={right}
        now={now}
        activeNext={activeNext}
      />
    </div>
  );
}

function RoundColumnContainer({
  event: e,
  slot,
  now,
  activeNext,
}: {
  event: DisplayEvent;
  slot: { idx: number; status: RoundSlotStatus };
  now: Date;
  activeNext?: DateName;
}) {
  const round = e.rounds[slot.idx];
  const isActive = slot.status === "active";
  const effectiveActiveNext = isActive ? activeNext : undefined;
  const rows = round ? buildRoundRows(round, now, effectiveActiveNext) : [];
  if (!round) return <div />;
  return (
    <RoundColumn
      idx={slot.idx}
      status={slot.status}
      rows={rows}
      active={isActive}
    />
  );
}

function RoundColumn({
  idx,
  status,
  rows,
  active,
}: {
  idx: number;
  status: RoundSlotStatus;
  rows: RailRow[];
  active: boolean;
}) {
  const urgent = active && rows.some((r) => r.kind === "next" && r.urgent);
  const accentClass = urgent ? "text-hot" : "text-[color:var(--accent)]";
  const borderClass = urgent ? "border-hot" : "border-[color:var(--accent)]";
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 border-l-2 pl-2.5",
        active ? borderClass : "border-rule"
      )}
    >
      <div
        className={clsx(
          "flex items-baseline gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
          active ? accentClass : "text-ink-3"
        )}
      >
        Round {idx + 1}
        <span
          className="rounded-xs border px-1 py-px text-[9px]"
          style={{ borderColor: "currentColor" }}
        >
          {status}
        </span>
      </div>
      {rows.map((r) => (
        <DateRow key={r.name} row={r} />
      ))}
    </div>
  );
}
