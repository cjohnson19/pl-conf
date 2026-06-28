"use client";

import { createContext, useContext } from "react";
import clsx from "clsx";
import { type Tag, tagDisplayName } from "../lib/event";

type TagFilter = {
  activeTags: ReadonlySet<Tag>;
  onToggle: (tag: Tag) => void;
};

const TagFilterContext = createContext<TagFilter | null>(null);

export function TagFilterProvider({
  value,
  children,
}: {
  value: TagFilter;
  children: React.ReactNode;
}) {
  return (
    <TagFilterContext.Provider value={value}>
      {children}
    </TagFilterContext.Provider>
  );
}

export function ConnectedEventTags({
  tags,
  className,
}: {
  tags: Tag[];
  className?: string;
}) {
  const ctx = useContext(TagFilterContext);
  return (
    <EventTags
      tags={tags}
      activeTags={ctx?.activeTags}
      onToggle={ctx?.onToggle}
      className={className}
    />
  );
}

export function EventTags({
  tags,
  activeTags,
  onToggle,
  className,
}: {
  tags: Tag[];
  activeTags?: ReadonlySet<Tag>;
  onToggle?: (tag: Tag) => void;
  className?: string;
}) {
  if (tags.length === 0) return null;
  const base =
    "inline-flex h-[18px] items-center rounded-xs border px-1.5 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.06em]";
  return (
    <ul
      className={clsx("flex flex-wrap items-center gap-1", className)}
      aria-label="Tags"
    >
      {tags.map((tag) => {
        const active = activeTags?.has(tag) ?? false;
        // Without onToggle there's nowhere to filter (e.g. the event detail
        // page), so render a static label rather than an inert button that
        // still looks clickable.
        if (!onToggle) {
          return (
            <li key={tag}>
              <span
                data-tag={tag}
                className={clsx(base, "border-rule bg-transparent text-ink-2")}
              >
                {tagDisplayName(tag)}
              </span>
            </li>
          );
        }
        return (
          <li key={tag}>
            <button
              type="button"
              data-tag={tag}
              onClick={() => onToggle(tag)}
              aria-pressed={active}
              className={clsx(
                base,
                "cursor-pointer transition-colors",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-transparent text-ink-2 hover:border-ink hover:text-ink"
              )}
            >
              {tagDisplayName(tag)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
