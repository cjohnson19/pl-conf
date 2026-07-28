import { type MaybeDate, type ScheduledEvent, eventPath } from "./event";

export type RelatedEvent = {
  abbreviation: string;
  name: string;
  type: ScheduledEvent["type"];
  date: { start: MaybeDate; end: MaybeDate };
  location?: string;
  path: string;
};

export type EventRelations = {
  partOf: RelatedEvent[];
  colocatedWith: RelatedEvent[];
  contains: RelatedEvent[];
};

function toRelated(e: ScheduledEvent): RelatedEvent {
  return {
    abbreviation: e.abbreviation,
    name: e.name,
    type: e.type,
    date: e.date,
    location: e.location,
    path: eventPath(e),
  };
}

function byStartThenAbbrev(a: ScheduledEvent, b: ScheduledEvent): number {
  const aTbd = a.date.start === "TBD";
  const bTbd = b.date.start === "TBD";
  if (aTbd || bTbd) {
    if (aTbd && bTbd) return a.abbreviation.localeCompare(b.abbreviation);
    return aTbd ? 1 : -1;
  }
  if (a.date.start !== b.date.start)
    return a.date.start < b.date.start ? -1 : 1;
  return a.abbreviation.localeCompare(b.abbreviation);
}

export function resolveRelations(
  target: ScheduledEvent,
  all: ScheduledEvent[]
): EventRelations {
  const siblings = all.filter((e) => e !== target && e.year === target.year);

  const partOf = siblings.filter((e) => target.partOf.includes(e.abbreviation));
  const colocatedWith = siblings.filter(
    (e) =>
      target.colocatedWith.includes(e.abbreviation) ||
      e.colocatedWith.includes(target.abbreviation)
  );
  const contains = siblings.filter((e) =>
    e.partOf.includes(target.abbreviation)
  );

  return {
    partOf: partOf.sort(byStartThenAbbrev).map(toRelated),
    colocatedWith: colocatedWith.sort(byStartThenAbbrev).map(toRelated),
    contains: contains.sort(byStartThenAbbrev).map(toRelated),
  };
}
