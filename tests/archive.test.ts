import { describe, expect, it } from "vitest";
import { events } from "@pl-conf/data";
import { eventKey, type Tag } from "@pl-conf/core";
import { computeEventListView } from "@/lib/event-list-view";
import { defaultFilterParams, type FilterParams } from "@/lib/filter-params";

const NOW = new Date("2026-06-01T12:00:00.000Z");
const all = Object.values(events);

const params = (overrides: Partial<FilterParams> = {}): FilterParams => ({
  ...defaultFilterParams,
  tags: new Set<Tag>(),
  ...overrides,
});

const abbrevs = (view: ReturnType<typeof computeEventListView>) =>
  view.displayEvents.map((e) => e.abbreviation);

describe("live list", () => {
  it("leaves finished events out", () => {
    const view = computeEventListView(all, params(), NOW);
    expect(abbrevs(view)).not.toContain("MOCKF");
    expect(abbrevs(view)).not.toContain("MOCKG");
    expect(view.activeEvents).toHaveLength(5);
  });

  it("counts the archive for the tab badge without listing it", () => {
    const view = computeEventListView(all, params(), NOW);
    expect(view.viewCounts.archive).toBe(2);
    expect(view.viewCounts.all).toBe(5);
    expect(view.categoryCounts.all).toBe(5);
  });

  it("ships every event as countable so archive counts survive hiding", () => {
    const view = computeEventListView(all, params(), NOW);
    expect(view.countableEvents).toHaveLength(all.length);
    const archived = view.countableEvents.filter((e) => e.archived);
    expect(archived.map((e) => e.key)).toEqual(
      view.archivedEvents.map(eventKey)
    );
  });
});

describe("archive view", () => {
  const archive = (overrides: Partial<FilterParams> = {}) =>
    computeEventListView(all, params({ view: "archive", ...overrides }), NOW);

  it("lists only finished events, most recent first", () => {
    const view = archive();
    expect(view.isArchive).toBe(true);
    expect(abbrevs(view)).toEqual(["MOCKF", "MOCKG"]);
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
    expect(view.viewCounts.all).toBe(5);
    expect(view.viewCounts.archive).toBe(2);
    expect(view.dueThisWeek).toBe(
      computeEventListView(all, params(), NOW).dueThisWeek
    );
  });

  it("scopes chips and tag counts to the archived pool", () => {
    const view = archive();
    expect(view.categoryCounts).toMatchObject({
      all: 2,
      symposium: 1,
      workshop: 1,
      conference: 0,
    });
    expect(view.tagCounts.logic).toBe(1);
    expect(view.tagCounts.semantics).toBe(0);
  });

  it("applies the category filter within the archive", () => {
    expect(abbrevs(archive({ category: "workshop" }))).toEqual(["MOCKG"]);
  });

  it("applies the tag filter within the archive", () => {
    const view = archive({ tags: new Set<Tag>(["logic"]) });
    expect(abbrevs(view)).toEqual(["MOCKF"]);
    // Tab counts follow the same chips into the live list.
    expect(view.viewCounts.all).toBe(0);
  });

  it("anchors nothing on a countdown — no hero comes from the archive", () => {
    const view = archive();
    expect(view.heroEvents.map((e) => e.abbreviation)).not.toContain("MOCKF");
    expect(view.totalActive).toBe(5);
  });
});
