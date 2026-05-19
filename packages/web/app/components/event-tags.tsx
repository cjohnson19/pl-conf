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
  return (
    <ul
      className={clsx("flex flex-wrap items-center gap-1", className)}
      aria-label="Tags"
    >
      {tags.map((tag) => {
        const active = activeTags?.has(tag) ?? false;
        return (
          <li key={tag}>
            <button
              type="button"
              data-tag={tag}
              onClick={onToggle ? () => onToggle(tag) : undefined}
              aria-pressed={onToggle ? active : undefined}
              className={clsx(
                "inline-flex h-[18px] items-center rounded-xs border px-1.5 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.06em] transition-colors",
                onToggle && "cursor-pointer",
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
