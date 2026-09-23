import {
  type DeadlineEvent,
  type RoundSlotStatus,
  roundStatuses,
} from "../../lib/deadline";

export type RoundSlot = {
  idx: number;
  status: RoundSlotStatus;
};

export type RoundSlots = {
  left: RoundSlot | null;
  right: RoundSlot;
};

// The rail has room for two columns: the first two active rounds when several
// are in flight, otherwise the single relevant round paired with its
// predecessor (or the round after it when it is the first).
export function pickMultiRoundSlots(statuses: RoundSlotStatus[]): RoundSlots {
  const slots = statuses.map((status, idx) => ({ idx, status }));
  const active = slots.filter((s) => s.status === "active");
  if (active.length >= 2) return { left: active[0], right: active[1] };
  const anchor = active[0] ?? slots[slots.length - 1];
  if (anchor.idx > 0) return { left: slots[anchor.idx - 1], right: anchor };
  if (slots.length > 1) return { left: anchor, right: slots[1] };
  return { left: null, right: anchor };
}

// Round columns for the rail, or undefined when it shows one unlabeled round.
export function pickRailSlots(
  e: DeadlineEvent,
  now: Date
): RoundSlots | undefined {
  if (e.rounds.length < 2) return undefined;
  return pickMultiRoundSlots(roundStatuses(e, now));
}
