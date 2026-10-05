"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "../lib/event";
import { parseTagsParam, withParams } from "../lib/filter-params";

// The tag filter lives entirely in the URL; toggling re-renders the list on
// the server like the category chips do.
export function useTagFilter() {
  const router = useRouter();
  const activeTags = parseTagsParam(useSearchParams().get("tags"));
  const write = (next: Set<Tag>) =>
    router.replace(
      withParams({
        tags: next.size === 0 ? undefined : Array.from(next).sort().join(","),
      }),
      { scroll: false }
    );
  return {
    activeTags,
    toggle: (tag: Tag) => {
      const next = new Set(activeTags);
      if (!next.delete(tag)) next.add(tag);
      write(next);
    },
    clear: () => write(new Set()),
  };
}
