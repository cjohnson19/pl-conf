import { describe, expect, it } from "vitest";
import { BUILD_NOW_MS, events } from "@pl-conf/data";
import { eventKey, hasEndedAt, type Tag } from "@pl-conf/core";
import { computeCounts } from "@/lib/counts";
import { computeEventListView } from "@/lib/event-list-view";
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

const abbrevs = (view: ReturnType<typeof computeEventListView>) =>
  view.displayEvents.map((e) => e.abbreviation);

describe("live list", () => {
  const view = computeEventListView(all, params(), NOW);

  it("leaves finished events out", () => {
    expect(abbrevs(view)).not.toContain("MOCKF");
    expect(abbrevs(view)).not.toContain("MOCKG");
    expect(view.rows).toHaveLength(5);
  });

  it("counts the archive for the tab badge without listing it", () => {
    expect(view.counts.viewCounts).toEqual({
      all: 5,
      submissions: 3,
      archive: 2,
    });
    expect(view.counts.categoryCounts.all).toBe(5);
  });

  it("describes each row for client-side filtering", () => {
    expect(view.rows.map((r) => [r.key, r.open])).toEqual([
      ["MOCKE-2026", true],
      ["MOCKB-2026", true],
      ["MOCKA-2027", false],
      ["MOCKC-2027", true],
      ["MOCKD-2026", false],
    ]);
    expect(view.rows[1]?.haystack).toContain("borgo");
    expect(new Set(view.liveKeys)).toEqual(
      new Set(view.rows.map((r) => r.key))
    );
  });
});

describe("archive view", () => {
  const archive = (overrides: Partial<FilterParams> = {}) =>
    computeEventListView(all, params({ view: "archive", ...overrides }), NOW);

  it("lists only finished events, most recent first", () => {
    expect(abbrevs(archive())).toEqual(["MOCKF", "MOCKG"]);
    expect(new Set(archive().displayEvents.map(eventKey))).toEqual(
      new Set(all.filter(hasEndedAt(NOW)).map(eventKey))
    );
  });

  it("groups by the month the event took place in", () => {
    expect(archive().groups.map((g) => g.heading)).toEqual([
      { kind: "month", month: "2026-02" },
      { kind: "month", month: "2025-09" },
    ]);
  });

  it("keeps reporting the live tab counts and the live pool", () => {
    const view = archive();
    expect(view.counts.viewCounts.all).toBe(5);
    expect(view.counts.viewCounts.archive).toBe(2);
    expect(view.counts.dueThisWeek).toBe(
      computeEventListView(all, params(), NOW).counts.dueThisWeek
    );
    expect(view.liveKeys).toHaveLength(5);
    expect(view.rows.every((r) => !r.open)).toBe(true);
  });

  it("scopes chips and tag counts to the archived pool", () => {
    const c = computeCounts(all, params({ view: "archive" }), NOW);
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
    expect(view.counts.viewCounts.all).toBe(0);
    expect(view.liveKeys).toEqual([]);
  });

  it("anchors nothing on a countdown — no hero comes from the archive", () => {
    const view = archive();
    expect(view.heroEvents.map((e) => e.abbreviation)).not.toContain("MOCKF");
    expect(view.counts.totalActive).toBe(5);
  });
});
