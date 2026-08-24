import { describe, expect, it } from "vitest";
import { BUILD_NOW_MS, events } from "@pl-conf/data";
import { eventKey, hasEndedAt, type Tag } from "@pl-conf/core";
import { type Counts, type CountsInput, computeCounts } from "@/lib/counts";
import {
  type CountableEvent,
  computeEventListView,
} from "@/lib/event-list-view";
import { defaultFilterParams, type FilterParams } from "@/lib/filter-params";
import { FROZEN_NOW_ISO, FROZEN_NOW_MS } from "./frozen-now";

const NOW = new Date(FROZEN_NOW_ISO);
const all = Object.values(events);

describe("fixture clock", () => {
  it("pins BUILD_NOW_MS to the frozen instant", () => {
    expect(BUILD_NOW_MS).toBe(FROZEN_NOW_MS);
  });
});

const params = (overrides: Partial<FilterParams> = {}): FilterParams => ({
  ...defaultFilterParams,
  tags: new Set<Tag>(),
  ...overrides,
});

const counts = (
  countable: CountableEvent[],
  overrides: Partial<CountsInput> = {}
): Counts =>
  computeCounts(countable, {
    category: "all",
    tags: new Set(),
    view: "all",
    starredKeys: new Set(),
    starredLoaded: false,
    ...overrides,
  });

const abbrevs = (view: ReturnType<typeof computeEventListView>) =>
  view.displayEvents.map((e) => e.abbreviation);

describe("live list", () => {
  it("leaves finished events out", () => {
    const view = computeEventListView(all, params(), NOW);
    expect(abbrevs(view)).not.toContain("MOCKF");
    expect(abbrevs(view)).not.toContain("MOCKG");
    expect(view.countableEvents.filter((e) => !e.archived)).toHaveLength(5);
  });

  it("counts the archive for the tab badge without listing it", () => {
    const view = computeEventListView(all, params(), NOW);
    const c = counts(view.countableEvents);
    expect(c.viewCounts.archive).toBe(2);
    expect(c.viewCounts.all).toBe(5);
    expect(c.categoryCounts.all).toBe(5);
  });

  it("ships every schedulable event as countable so archive counts survive hiding", () => {
    const view = computeEventListView(all, params(), NOW);
    const countable = new Set(view.countableEvents.map((e) => e.key));
    // MOCKH's dates are TBD, so it is neither active nor ended: it belongs to
    // no list and has nothing to count. Every other event must be countable.
    const missing = all.filter((e) => !countable.has(eventKey(e)));
    expect(missing.map((e) => e.abbreviation)).toEqual(["MOCKH"]);
    const archived = view.countableEvents.filter((e) => e.archived);
    expect(archived.map((e) => e.key)).toEqual(
      all.filter(hasEndedAt(NOW)).map(eventKey)
    );
  });
});

describe("archive view", () => {
  const archive = (overrides: Partial<FilterParams> = {}) =>
    computeEventListView(all, params({ view: "archive", ...overrides }), NOW);

  it("lists only finished events, most recent first", () => {
    expect(abbrevs(archive())).toEqual(["MOCKF", "MOCKG"]);
  });

  it("groups by the month the event took place in", () => {
    const view = archive();
    expect(view.groups.map((g) => g.heading)).toEqual([
      { kind: "month", month: "2026-02" },
      { kind: "month", month: "2025-09" },
    ]);
  });

  it("keeps reporting the live tab counts", () => {
    const view = archive();
    const c = counts(view.countableEvents, { view: "archive" });
    expect(c.viewCounts.all).toBe(5);
    expect(c.viewCounts.archive).toBe(2);
    expect(c.dueThisWeek).toBe(counts(view.countableEvents).dueThisWeek);
  });

  it("scopes chips and tag counts to the archived pool", () => {
    const c = counts(archive().countableEvents, { view: "archive" });
    expect(c.categoryCounts).toMatchObject({
      all: 2,
      symposium: 1,
      workshop: 1,
      conference: 0,
    });
    expect(c.tagCounts.logic).toBe(1);
    expect(c.tagCounts.semantics).toBe(0);
  });

  it("applies the category filter within the archive", () => {
    expect(abbrevs(archive({ category: "workshop" }))).toEqual(["MOCKG"]);
  });

  it("applies the tag filter within the archive", () => {
    const view = archive({ tags: new Set<Tag>(["logic"]) });
    expect(abbrevs(view)).toEqual(["MOCKF"]);
    // Tab counts follow the same chips into the live list.
    const c = counts(view.countableEvents, {
      view: "archive",
      tags: new Set<Tag>(["logic"]),
    });
    expect(c.viewCounts.all).toBe(0);
  });

  it("anchors nothing on a countdown — no hero comes from the archive", () => {
    const view = archive();
    expect(view.heroEvents.map((e) => e.abbreviation)).not.toContain("MOCKF");
    expect(counts(view.countableEvents).totalActive).toBe(5);
  });
});
