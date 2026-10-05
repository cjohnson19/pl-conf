import { eventTypes, type Tag, tagValues } from "./event";

export type Category = "all" | (typeof eventTypes)[number];
export type View = "starred" | "all" | "submissions" | "archive";

const categories = new Set<string>(["all", ...eventTypes]);
const views = new Set<string>(["starred", "all", "submissions", "archive"]);
const knownTags = new Set<string>(tagValues);

export type FilterParams = {
  q: string;
  category: Category;
  view: View;
  tags: Set<Tag>;
};

export const defaultFilterParams: FilterParams = {
  q: "",
  category: "all",
  view: "all",
  tags: new Set(),
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseCategoryParam(raw: string | null | undefined): Category {
  return raw && categories.has(raw) ? (raw as Category) : "all";
}

export function parseViewParam(raw: string | null | undefined): View {
  return raw && views.has(raw) ? (raw as View) : "all";
}

export function parseTagsParam(raw: string | null | undefined): Set<Tag> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is Tag => knownTags.has(t))
  );
}

// The next query string after `updates`, built from the live URL rather than
// React's search-params snapshot, which never sees the `q` the search box
// writes with history.replaceState. `undefined` removes a parameter.
export function withParams(
  updates: Record<string, string | undefined>
): string {
  const sp = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === "") sp.delete(key);
    else sp.set(key, value);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "?";
}

export function parseFilterParams(sp: RawSearchParams): FilterParams {
  return {
    q: (firstValue(sp.q) ?? "").trim(),
    category: parseCategoryParam(firstValue(sp.c)),
    view: parseViewParam(firstValue(sp.view)),
    tags: parseTagsParam(firstValue(sp.tags)),
  };
}
