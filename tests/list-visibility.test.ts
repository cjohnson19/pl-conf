import { describe, expect, it } from "vitest";
import {
  type ListRow,
  visibilityCss,
  visibleKeys,
} from "@/lib/list-visibility";

const rows: ListRow[] = [
  { key: "A-2026", open: true, haystack: "alpha conference\natlantis" },
  { key: "B-2026", open: false, haystack: "beta workshop\nborgo" },
  { key: "C-2026", open: true, haystack: "gamma symposium\ncoruscant" },
];

const filter = (
  overrides: Partial<Parameters<typeof visibleKeys>[1]> = {}
) => ({
  view: "all" as const,
  query: "",
  starred: new Set<string>(),
  ...overrides,
});

describe("visibleKeys", () => {
  it("shows every row by default", () => {
    expect(visibleKeys(rows, filter())).toEqual(
      new Set(["A-2026", "B-2026", "C-2026"])
    );
  });

  it("restricts the starred view to the starred set", () => {
    expect(
      visibleKeys(
        rows,
        filter({ view: "starred", starred: new Set(["B-2026"]) })
      )
    ).toEqual(new Set(["B-2026"]));
  });

  it("restricts the submissions view to open rows", () => {
    expect(visibleKeys(rows, filter({ view: "submissions" }))).toEqual(
      new Set(["A-2026", "C-2026"])
    );
  });

  it("matches the search case-insensitively against the haystack", () => {
    expect(visibleKeys(rows, filter({ query: "  BORGO " }))).toEqual(
      new Set(["B-2026"])
    );
  });

  it("combines the view and the search", () => {
    expect(
      visibleKeys(rows, filter({ view: "submissions", query: "symposium" }))
    ).toEqual(new Set(["C-2026"]));
  });
});

describe("visibilityCss", () => {
  it("is empty when nothing is hidden", () => {
    expect(visibilityCss(rows, new Set(rows.map((r) => r.key)))).toBe("");
  });

  it("hides rows and groups wholesale when nothing is visible", () => {
    expect(visibilityCss(rows, new Set())).toBe(
      "[data-event-key]{display:none}[data-group-keys]{display:none}"
    );
  });

  it("hides the other rows and any group left without a visible row", () => {
    expect(visibilityCss(rows, new Set(["B-2026"]))).toBe(
      '[data-event-key]:not([data-event-key="B-2026"]){display:none}' +
        '[data-group-keys]:not(:has([data-event-key="B-2026"])){display:none}'
    );
  });
});
