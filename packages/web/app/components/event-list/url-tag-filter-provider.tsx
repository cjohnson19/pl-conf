"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type Tag, tagValues } from "../../lib/event";
import { TagFilterProvider } from "../event-tags";

const knownTags = new Set<string>(tagValues);

function parseTags(raw: string | null): Set<Tag> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is Tag => knownTags.has(t))
  );
}

export function UrlTagFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeTags = useMemo(
    () => parseTags(searchParams.get("tags")),
    [searchParams]
  );

  const toggleTag = useCallback(
    (tag: Tag) => {
      const next = new Set(activeTags);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      const sp = new URLSearchParams(searchParams.toString());
      if (next.size === 0) sp.delete("tags");
      else sp.set("tags", Array.from(next).sort().join(","));
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?");
      });
    },
    [activeTags, searchParams, router]
  );

  const value = useMemo(
    () => ({ activeTags, onToggle: toggleTag }),
    [activeTags, toggleTag]
  );

  return <TagFilterProvider value={value}>{children}</TagFilterProvider>;
}
