import { eventTypes, type Tag, tagValues } from "./event";

export type Category =
  | "all"
  | "conference"
  | "workshop"
  | "symposium"
  | "school";
export type View = "starred" | "all" | "submissions";

const categories = new Set<string>(["all", ...eventTypes, "school"]);
const views = new Set<string>(["starred", "all", "submissions"]);
const tags = new Set<string>(tagValues);

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

export function parseFilterParams(sp: RawSearchParams): FilterParams {
  const q = (firstValue(sp.q) ?? "").trim();

  const catRaw = firstValue(sp.c);
  const category: Category =
    catRaw && categories.has(catRaw) ? (catRaw as Category) : "all";

  const viewRaw = firstValue(sp.view);
  const view: View = viewRaw && views.has(viewRaw) ? (viewRaw as View) : "all";

  const tagsRaw = firstValue(sp.tags) ?? "";
  const parsedTags = new Set<Tag>(
    tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is Tag => tags.has(t))
  );

  return { q, category, view, tags: parsedTags };
}

export function serializeFilterParams(p: FilterParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.category !== "all") sp.set("c", p.category);
  if (p.view !== "all") sp.set("view", p.view);
  if (p.tags.size > 0) sp.set("tags", [...p.tags].sort().join(","));
  return sp;
}
