"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Command, LayoutGrid, Rows3, Search, Star } from "lucide-react";
import type { Category, Layout, View } from "./use-event-list-state";

const CATEGORY_CHIPS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "conference", label: "Conferences" },
  { key: "workshop", label: "Workshops" },
  { key: "symposium", label: "Symposia" },
  { key: "school", label: "Schools" },
];

export function SearchPill({
  value,
  setValue,
}: {
  value: string;
  setValue: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    );
  }, []);
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
        className="h-[38px] w-full rounded-pill border border-rule bg-[color:var(--card)] pl-[38px] pr-12 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden select-none items-center gap-0.5 rounded-pill bg-paper-2 px-1.5 py-[3px] font-mono text-[10px] font-medium text-ink-2 sm:inline-flex"
      >
        {isMac ? <Command size={10} /> : <span>Ctrl</span>}
        <span>K</span>
      </kbd>
    </div>
  );
}

export function FilterChips({
  active,
  counts,
  onSelect,
}: {
  active: Category;
  counts: Record<Category, number>;
  onSelect: (c: Category) => void;
}) {
  return (
    <>
      {CATEGORY_CHIPS.map(({ key, label }) => {
        const on = key === active;
        const count = counts[key];
        if (key === "school" && count === 0) return null;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={clsx(
              "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3.5 text-[13px] transition-colors",
              on
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-transparent text-ink-2 hover:text-ink"
            )}
          >
            {label}
            <span className="font-mono text-[10px] opacity-65">{count}</span>
          </button>
        );
      })}
    </>
  );
}

export function ViewTabs({
  active,
  counts,
  onSelect,
  trailing,
}: {
  active: View;
  counts: Record<View, number>;
  onSelect: (v: View) => void;
  trailing?: React.ReactNode;
}) {
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
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(t.key)}
              className={clsx(
                "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent bg-transparent px-2 py-2.5 text-[13px] font-medium transition-colors sm:gap-2 sm:px-3.5",
                on ? "border-ink text-ink" : "text-ink-3 hover:text-ink-2"
              )}
            >
              {t.icon}
              {t.shortLabel ? (
                <>
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.shortLabel}</span>
                </>
              ) : (
                t.label
              )}
              <span
                className={clsx(
                  "hidden font-mono text-[11px] sm:inline",
                  on ? "text-ink-2" : "text-ink-3"
                )}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>
      {trailing && (
        <div className="flex shrink-0 items-center gap-4 pb-2">{trailing}</div>
      )}
    </div>
  );
}

export function LayoutToggle({
  layout,
  setLayout,
}: {
  layout: Layout;
  setLayout: (next: Layout) => void;
}) {
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
    <div className="inline-flex items-center rounded-pill border border-rule p-0.5">
      {options.map((o) => {
        const on = o.key === layout;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setLayout(o.key)}
            aria-label={o.label}
            aria-pressed={on}
            title={o.label}
            className={clsx(
              "grid h-7 w-8 place-items-center rounded-pill transition-colors",
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
