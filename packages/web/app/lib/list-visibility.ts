import type { View } from "./filter-params";

// Event keys are alphanumerics plus a few separators, so escaping \ and " is
// enough for an attribute selector; CSS.escape is browser-only and this also
// runs on the server. lib/pre-paint.ts carries its own copy.
const eventKeySelector = (key: string) =>
  `[data-event-key="${key.replace(/[\\"]/g, "\\$&")}"]`;

// What the client needs to know about each server-rendered row to filter it
// without re-rendering: whether submissions are open and what search matches.
export type ListRow = { key: string; open: boolean; haystack: string };

export type ListFilter = {
  view: View;
  query: string;
  starred: ReadonlySet<string>;
};

export function visibleKeys(
  rows: ListRow[],
  { view, query, starred }: ListFilter
): Set<string> {
  const needle = query.trim().toLowerCase();
  return new Set(
    rows
      .filter((r) => view !== "starred" || starred.has(r.key))
      .filter((r) => view !== "submissions" || r.open)
      .filter((r) => needle === "" || r.haystack.includes(needle))
      .map((r) => r.key)
  );
}

// CSS that hides every row outside `visible`, and every group left with no
// visible row. Empty when nothing needs hiding. The pre-paint script in
// lib/pre-paint.ts emits the same two rule shapes before hydration.
export function visibilityCss(
  rows: ListRow[],
  visible: ReadonlySet<string>
): string {
  if (visible.size === rows.length) return "";
  if (visible.size === 0) {
    return "[data-event-key]{display:none}[data-group-keys]{display:none}";
  }
  const sel = Array.from(visible).map(eventKeySelector).join(",");
  return (
    `[data-event-key]:not(${sel}){display:none}` +
    `[data-group-keys]:not(:has(${sel})){display:none}`
  );
}
