"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "../../lib/event";
import { parseTagsParam } from "../../lib/filter-params";
import { TagFilterProvider } from "../event-tags";

export function UrlTagFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeTags = useMemo(
    () => parseTagsParam(searchParams.get("tags")),
    [searchParams]
  );

  const writeTags = useCallback(
    (next: Set<Tag>) => {
      // Read live URL, not the React snapshot, so we don't lose `q` written
      // by SearchProvider's debounced history.replaceState.
      const sp =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(searchParams.toString());
      if (next.size === 0) sp.delete("tags");
      else sp.set("tags", Array.from(next).sort().join(","));
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?", { scroll: false });
      });
    },
    [searchParams, router]
  );

  const toggleTag = useCallback(
    (tag: Tag) => {
      const next = new Set(activeTags);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      writeTags(next);
    },
    [activeTags, writeTags]
  );

  const clearTags = useCallback(() => writeTags(new Set()), [writeTags]);

  const value = useMemo(
    () => ({ activeTags, onToggle: toggleTag, onClear: clearTags }),
    [activeTags, toggleTag, clearTags]
  );

  return <TagFilterProvider value={value}>{children}</TagFilterProvider>;
}
