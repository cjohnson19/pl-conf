import { describe, expect, it } from "vitest";
import { ScheduledEvent } from "@pl-conf/core/schemas";
import { computeEventListView } from "@/lib/event-list-view";
import { defaultFilterParams, type FilterParams } from "@/lib/filter-params";
import { FROZEN_NOW_ISO } from "./frozen-now";

const NOW = new Date(FROZEN_NOW_ISO);
const params: FilterParams = { ...defaultFilterParams, tags: new Set() };

// Every event runs in September 2026, so all are live at NOW; only their
// deadlines differ.
const event = (abbreviation: string, dates: Record<string, unknown> = {}) =>
  ScheduledEvent.parse({
    name: `Mock ${abbreviation}`,
    abbreviation,
    type: "workshop",
    year: 2026,
    date: { start: "2026-09-10", end: "2026-09-12" },
    url: `https://example.com/${abbreviation}`,
    importantDateUrl: `https://example.com/${abbreviation}/dates`,
    lastUpdated: "2026-01-01",
    sequence: 0,
    ...dates,
  });

const upcoming = event("UPCOMING", {
  importantDates: { paper: "2026-07-01" },
});
const closed = event("CLOSED", {
  importantDates: { paper: "2026-03-01", notification: "2026-04-15" },
});
const unlisted = event("UNLISTED");
const tbdOnly = event("TBDONLY", { importantDates: { paper: "TBD" } });
// Has had a deadline go by, with a later round still TBD: closed, not
// unlisted — it is not waiting on its first deadline.
const mixed = event("MIXED", {
  rounds: [
    { name: "Round 1", importantDates: { paper: "2026-03-01" } },
    { name: "Round 2", importantDates: { paper: "TBD" } },
  ],
});

describe("live list grouping", () => {
  const view = computeEventListView(
    [closed, unlisted, tbdOnly, upcoming, mixed],
    params,
    NOW
  );

  it("orders upcoming deadlines, then unlisted, then closed", () => {
    expect(view.displayEvents.map((e) => e.abbreviation)).toEqual([
      "UPCOMING",
      "TBDONLY",
      "UNLISTED",
      "CLOSED",
      "MIXED",
    ]);
  });

  it("heads the unlisted and closed events with their own groups", () => {
    expect(view.groups.map((g) => g.heading)).toEqual([
      { kind: "deadline", date: "2026/07/01" },
      { kind: "unlisted" },
      { kind: "closed" },
    ]);
    expect(view.groups.map((g) => g.events.map((e) => e.abbreviation))).toEqual(
      [["UPCOMING"], ["TBDONLY", "UNLISTED"], ["CLOSED", "MIXED"]]
    );
  });

  it("omits a catch-all group when nothing falls into it", () => {
    const only = computeEventListView([upcoming, closed], params, NOW);
    expect(only.groups.map((g) => g.heading.kind)).toEqual([
      "deadline",
      "closed",
    ]);
  });
});
