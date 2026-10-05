"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  Command,
  LayoutGrid,
  Rows3,
  Search,
  Star,
  Tags as TagsIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { type Tag, tagDisplayName, tagValues } from "../../lib/event";
import {
  type Category,
  type View,
  parseCategoryParam,
  withParams,
} from "../../lib/filter-params";
import { setDisplayPref } from "../../lib/preferences-store";
import type { Counts } from "../../lib/counts";
import type { DisplayPreferences } from "../../lib/user-prefs";
import { useTagFilter } from "../../hooks/use-tag-filter";
import { useDisplayPref } from "../../hooks/use-preferences";
import { useListFilter } from "./list-filter";

type Layout = DisplayPreferences["layout"];

const CATEGORY_CHIPS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "conference", label: "Conferences" },
  { key: "workshop", label: "Workshops" },
  { key: "symposium", label: "Symposia" },
];

const chipClass = (on: boolean) =>
  clsx(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors",
    on
      ? "border-ink bg-ink text-paper"
      : "border-rule bg-transparent text-ink-2 hover:text-ink"
  );

export function SearchPill() {
  const { query: value, setQuery: setValue } = useListFilter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative w-full min-w-[200px] flex-1 sm:max-w-[360px]">
      <Search
        size={14}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search events…"
        className="h-[38px] w-full rounded-full border border-rule bg-card pl-[38px] pr-12 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
        aria-keyshortcuts="Meta+K Control+K"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden select-none items-center gap-0.5 rounded-full bg-paper-2 px-1.5 py-[3px] font-mono text-[10px] font-medium text-ink-2 sm:inline-flex"
      >
        <Command size={10} className="hidden os-mac:inline" />
        <span className="os-mac:hidden">Ctrl</span>
        <span>K</span>
      </kbd>
    </div>
  );
}

export function FilterChips({ counts }: { counts: Record<Category, number> }) {
  const router = useRouter();
  const active = parseCategoryParam(useSearchParams().get("c"));
  const select = (key: Category) =>
    router.replace(withParams({ c: key === "all" ? undefined : key }), {
      scroll: false,
    });
  return (
    <>
      {CATEGORY_CHIPS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => select(key)}
          className={chipClass(key === active)}
        >
          {label}
          <span className="font-mono text-[10px] opacity-90">
            {counts[key]}
          </span>
        </button>
      ))}
    </>
  );
}

export function TagsFilter({ counts }: { counts: Record<Tag, number> }) {
  const { activeTags, toggle, clear } = useTagFilter();
  const activeCount = activeTags.size;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter by tags"
          className={chipClass(activeCount > 0)}
        >
          <TagsIcon size={13} strokeWidth={1.75} />
          Tags
          {activeCount > 0 && (
            <span className="font-mono text-[10px] opacity-80">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(320px,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <p className="label-cap">Filter by tags</p>
          <button
            type="button"
            onClick={clear}
            disabled={activeCount === 0}
            className="text-[11px] font-medium text-ink-2 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-3"
          >
            Clear
          </button>
        </div>
        <ul className="max-h-[320px] overflow-y-auto py-1">
          {tagValues.map((tag) => {
            const checked = activeTags.has(tag);
            const count = counts[tag];
            const disabled = count === 0 && !checked;
            return (
              <li key={tag}>
                <button
                  type="button"
                  data-tag={tag}
                  aria-pressed={checked}
                  onClick={() => toggle(tag)}
                  disabled={disabled}
                  className={clsx(
                    "flex w-full items-center justify-between gap-3 px-4 py-1.5 text-left text-[13px] transition-colors",
                    disabled
                      ? "cursor-not-allowed text-ink-3"
                      : "text-ink-2 hover:bg-paper-2 hover:text-ink"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className={clsx(
                        "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-xs border transition-colors",
                        checked
                          ? "border-ink bg-ink"
                          : "border-rule bg-transparent"
                      )}
                    >
                      {checked && (
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 8 8"
                          fill="none"
                          role="presentation"
                          aria-hidden
                        >
                          <title>Checked</title>
                          <path
                            d="M1.5 4.25 3.25 6 6.5 2"
                            stroke="var(--paper)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{tagDisplayName(tag)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-3">
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ViewTabs({
  counts,
  trailing,
}: {
  counts: Counts["viewCounts"];
  trailing: React.ReactNode;
}) {
  const { view: active, starredCount } = useListFilter();
  // Every view is a CSS filter over rows the page already shipped, so a tab
  // switch is a bare history entry; the archive is a separate page, linked
  // from below the list.
  const select = (next: View) =>
    window.history.replaceState(
      null,
      "",
      withParams({ view: next === "all" ? undefined : next })
    );
  const tabs: {
    key: View;
    label: string;
    shortLabel?: string;
    icon?: React.ReactNode;
  }[] = [
    {
      key: "starred",
      label: "Starred",
      icon: (
        <Star
          size={15}
          strokeWidth={1.75}
          fill="currentColor"
          style={{ color: "var(--accent)" }}
        />
      ),
    },
    { key: "all", label: "All events", shortLabel: "All" },
    { key: "submissions", label: "Submissions open", shortLabel: "Open" },
  ];
  return (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-2 border-b border-rule px-5 pt-8 sm:gap-x-4 md:px-8">
      <div className="-mx-5 flex flex-1 gap-0.5 overflow-x-auto overflow-y-hidden px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1 md:mx-0 md:overflow-visible md:px-0">
        {tabs.map((t) => {
          const on = t.key === active;
          const count = t.key === "starred" ? starredCount : counts[t.key];
          const className = clsx(
            "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent bg-transparent px-2 py-2.5 text-[13px] font-medium no-underline transition-colors sm:gap-2 sm:px-3.5",
            on ? "border-ink text-ink" : "text-ink-3 hover:text-ink-2"
          );
          const content = (
            <>
              {t.icon}
              {t.shortLabel ? (
                <>
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.shortLabel}</span>
                </>
              ) : (
                t.label
              )}
              {count !== undefined && (
                <span
                  className={clsx(
                    "hidden font-mono text-[11px] sm:inline",
                    on ? "text-ink-2" : "text-ink-3"
                  )}
                >
                  {count}
                </span>
              )}
            </>
          );
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => select(t.key)}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-4 pb-2">{trailing}</div>
    </div>
  );
}

export function LayoutToggle() {
  const layout = useDisplayPref("layout");
  const options: {
    key: Layout;
    icon: React.ReactNode;
    label: string;
  }[] = [
    {
      key: "list",
      icon: <Rows3 size={14} strokeWidth={1.75} />,
      label: "List view",
    },
    {
      key: "grid",
      icon: <LayoutGrid size={14} strokeWidth={1.75} />,
      label: "Grid view",
    },
  ];
  return (
    <div className="inline-flex items-center rounded-full border border-rule p-0.5">
      {options.map((o) => {
        const on = o.key === layout;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setDisplayPref("layout", o.key)}
            aria-label={o.label}
            aria-pressed={on}
            title={o.label}
            className={clsx(
              "grid h-7 w-8 place-items-center rounded-full transition-colors",
              on
                ? "bg-ink text-paper"
                : "bg-transparent text-ink-3 hover:text-ink"
            )}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}
