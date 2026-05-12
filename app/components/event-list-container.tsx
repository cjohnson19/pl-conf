"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import clsx from "clsx";
import {
  Calendar,
  Command,
  LayoutGrid,
  MoreHorizontal,
  Rows3,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  type DateName,
  type MaybeDate,
  type ScheduledEvent,
  eventKey,
  isDeadline,
  isDeadlineUrgent,
  toAoeInstant,
  toCalendarDate,
} from "../lib/event";
import { humanCountdown } from "../lib/countdown";
import {
  applyFilters,
  isActive,
  matchesText,
  openToNewSubmissions,
} from "../lib/event-filter";
import { PreferencesProvider, usePreferences } from "./preferences-provider";
import { EventCard, EventRow } from "./event-row";
import { Skeleton } from "./ui/skeleton";
import { LastUpdated } from "./last-updated";

const hasOpenSubmission = openToNewSubmissions(true);

type Category = "all" | "conference" | "workshop" | "symposium" | "school";
type View = "starred" | "all" | "submissions";

const CATEGORY_CHIPS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "conference", label: "Conferences" },
  { key: "workshop", label: "Workshops" },
  { key: "symposium", label: "Symposia" },
  { key: "school", label: "Schools" },
];

type NextDeadline = {
  date: string;
  name: DateName;
  roundIdx: number;
  time: number;
};

function findNextDeadline(e: ScheduledEvent, now: Date): NextDeadline | null {
  const nowTime = now.getTime();
  let best: NextDeadline | null = null;
  e.rounds.forEach((r, roundIdx) => {
    (Object.entries(r.importantDates) as Array<[DateName, MaybeDate]>).forEach(
      ([name, date]) => {
        if (date === "TBD" || date === undefined) return;
        const instant = toAoeInstant(date);
        if (!instant) return;
        const time = instant.getTime();
        if (time <= nowTime) return;
        if (!best || time < best.time) {
          best = { date, name, roundIdx, time };
        }
      }
    );
  });
  return best;
}

function deadlineKindWord(name: DateName): string {
  if (name === "paper") return "paper";
  if (name === "abstract") return "abstract";
  if (name === "notification") return "notification";
  if (name === "rebuttal") return "rebuttal";
  if (name === "conditional-acceptance") return "conditional acceptance";
  if (name === "camera-ready") return "camera-ready";
  if (name === "revisions") return "revisions";
  return name;
}

const dowFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const monDayFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const tzFmt = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" });

function localDeadlineString(date: string): string {
  const instant = toAoeInstant(date);
  if (!instant) return "";
  const dow = dowFmt.format(instant);
  const dat = monDayFmt.format(instant);
  const tim = timeFmt.format(instant);
  const tz =
    tzFmt.formatToParts(instant).find((p) => p.type === "timeZoneName")
      ?.value ?? "";
  return `${dow} · ${dat} · ${tim}${tz ? " " + tz : ""} (local)`;
}

function isDueThisWeek(e: ScheduledEvent, now: Date): boolean {
  const weekMs = 7 * 86_400_000;
  return e.rounds.some((r) =>
    (Object.entries(r.importantDates) as Array<[DateName, MaybeDate]>).some(
      ([name, date]) => {
        if (!isDeadline(name)) return false;
        if (date === "TBD" || date === undefined) return false;
        const instant = toAoeInstant(date);
        if (!instant) return false;
        const diff = instant.getTime() - now.getTime();
        return diff > 0 && diff <= weekMs;
      }
    )
  );
}

function findNextStart(
  e: ScheduledEvent,
  now: Date
): { date: string; time: number } | null {
  if (e.date.start === "TBD") return null;
  const instant = toAoeInstant(e.date.start);
  if (!instant) return null;
  const time = instant.getTime();
  if (time <= now.getTime()) return null;
  return { date: e.date.start, time };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HERO_CUTOFF_DAYS = 14;
const SESSION_DISMISSED_KEY = "dismissedHeroKeys";
const SESSION_VIEW_KEY = "view";

function useSessionState<T extends string>(
  key: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored !== null) setValue(stored as T);
    } catch {}
    setLoaded(true);
  }, [key]);
  const set: Dispatch<SetStateAction<T>> = (v) => {
    setValue((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try {
        window.sessionStorage.setItem(key, next);
      } catch {}
      return next;
    });
  };
  return [value, set, loaded];
}

function useSessionDismissedHeroes() {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SESSION_DISMISSED_KEY);
      if (stored) setKeys(new Set(JSON.parse(stored)));
    } catch {}
  }, []);
  const dismiss = (key: string) => {
    setKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      try {
        window.sessionStorage.setItem(
          SESSION_DISMISSED_KEY,
          JSON.stringify([...next])
        );
      } catch {}
      return next;
    });
  };
  return { keys, dismiss };
}

const monDayYearFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const weekdayLongFmt = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const monthLongFmt = new Intl.DateTimeFormat(undefined, { month: "long" });

type Group = {
  key: string;
  date: string | null;
  events: ScheduledEvent[];
};

function buildGroups(events: ScheduledEvent[], now: Date): Group[] {
  return events.reduce<Group[]>((acc, event) => {
    const leadDate = findNextDeadline(event, now)?.date ?? null;
    const last = acc[acc.length - 1];
    if (last && last.date === leadDate) {
      last.events.push(event);
      return acc;
    }
    acc.push({
      key: `${leadDate ?? "none"}:${acc.length}`,
      date: leadDate,
      events: [event],
    });
    return acc;
  }, []);
}

function DeadlineGroupHeader({
  date,
  count,
  now,
}: {
  date: string | null;
  count: number;
  now: Date;
}) {
  if (date === null) {
    return (
      <div
        className="sticky top-0 z-10 -mx-5 md:-mx-8"
        style={{ background: "var(--paper)" }}
      >
        <div className="flex items-end justify-between gap-4 border-b border-rule px-5 pb-3 pt-4 md:px-8">
          <h2 className="font-ui text-[18px] font-semibold leading-none tracking-[-0.02em] text-ink-2 sm:text-[22px]">
            No upcoming deadlines
          </h2>
          <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
            <b className="font-medium text-ink-2">{count}</b> event
            {count === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    );
  }
  const cal = toCalendarDate(date);
  if (!cal) return null;
  const urgent = isDeadlineUrgent(date, now);
  const instant = toAoeInstant(date);
  const past = instant ? instant.getTime() < now.getTime() : false;
  return (
    <div
      className="sticky top-0 z-10 -mx-5 md:-mx-8"
      style={{ background: "var(--paper)" }}
    >
      <div className="flex items-end justify-between gap-4 border-b border-rule px-5 pb-3 pt-4 md:px-8">
        <h2 className="flex items-end gap-3 font-ui">
          <span
            className={clsx(
              "font-semibold leading-[0.8] tracking-[-0.025em] tabular-nums",
              "text-[30px] sm:text-[36px]",
              urgent ? "text-hot" : "text-[color:var(--accent)]"
            )}
          >
            {cal.getDate()}
          </span>
          <span className="flex flex-col gap-1 leading-none">
            <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-ink sm:text-[13px]">
              {monthLongFmt.format(cal)} {cal.getFullYear()}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 sm:text-[11px]">
              {weekdayLongFmt.format(cal)}
            </span>
          </span>
        </h2>
        <div className="flex flex-col items-end gap-1 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
          {!past && (
            <span
              className={clsx(
                "font-medium",
                urgent ? "text-hot" : "text-[color:var(--accent)]"
              )}
            >
              {humanCountdown(date, now)}
            </span>
          )}
          <span>
            <b className="font-medium text-ink-2">{count}</b> deadline
            {count === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}

function Hero({
  events,
  starredKeys,
  now,
  totalActive,
}: {
  events: ScheduledEvent[];
  starredKeys: Set<string>;
  now: Date;
  totalActive: number;
}) {
  const { prefs, setPrefs, prefsLoaded } = usePreferences();
  const { keys: sessionDismissed, dismiss: dismissThisSession } =
    useSessionDismissedHeroes();
  const hideEventForever = (key: string) =>
    setPrefs((p) => ({
      ...p,
      display: {
        ...p.display,
        permanentlyHiddenEventHeroes: Array.from(
          new Set([...(p.display.permanentlyHiddenEventHeroes ?? []), key])
        ),
      },
    }));
  const dismissAllAlerts = () =>
    setPrefs((p) => ({
      ...p,
      display: { ...p.display, deadlineHeroDismissed: true },
    }));
  const alertMenuItems = (event: ScheduledEvent, evKey: string) => [
    {
      label: `Hide alerts for ${event.abbreviation}`,
      description: "Always hide this event's deadline cards.",
      onSelect: () => hideEventForever(evKey),
    },
    {
      label: "Stop showing deadline alerts",
      description: "Permanently hides this card for every event.",
      onSelect: dismissAllAlerts,
    },
  ];
  const { upcomingDeadlines, upcomingStarts } = useMemo(() => {
    const horizon = now.getTime() + HERO_CUTOFF_DAYS * MS_PER_DAY;
    const starred = events.filter((e) => starredKeys.has(eventKey(e)));
    return {
      upcomingDeadlines: starred.flatMap((event) => {
        const lead = findNextDeadline(event, now);
        return lead && lead.time <= horizon
          ? [{ event, date: lead.date, name: lead.name, time: lead.time }]
          : [];
      }),
      upcomingStarts: starred.flatMap((event) => {
        const start = findNextStart(event, now);
        return start && start.time <= horizon
          ? [{ event, date: start.date, time: start.time }]
          : [];
      }),
    };
  }, [events, starredKeys, now]);

  if (starredKeys.size === 0) {
    return <IntroHero totalActive={totalActive} />;
  }

  if (!prefsLoaded || prefs.display.deadlineHeroDismissed) return null;

  if (upcomingDeadlines.length > 0) {
    const pick = upcomingDeadlines.reduce((a, b) => (a.time <= b.time ? a : b));
    const evKey = eventKey(pick.event);
    const pickKey = `deadline:${evKey}:${pick.name}:${pick.date}`;
    if (sessionDismissed.has(pickKey)) return null;
    if (prefs.display.permanentlyHiddenEventHeroes?.includes(evKey))
      return null;
    const deadline = isDeadline(pick.name);
    const urgent = isDeadlineUrgent(pick.date, now);
    return (
      <HeroShell
        label={deadline ? "Your next deadline" : "Coming up"}
        onDismissOnce={() => dismissThisSession(pickKey)}
        menuItems={alertMenuItems(pick.event, evKey)}
        headline={
          <>
            <span className="font-semibold">
              {pick.event.abbreviation} {deadlineKindWord(pick.name)}
            </span>{" "}
            {deadline ? "is due " : ""}
            <em
              style={{
                fontStyle: "normal",
                color: urgent ? "var(--hot)" : "var(--accent)",
                fontWeight: 600,
              }}
            >
              {humanCountdown(pick.date, now)}
            </em>
            .
          </>
        }
        footer={localDeadlineString(pick.date)}
        footerTitle={`${pick.date} · 23:59 AoE`}
      />
    );
  }

  if (upcomingStarts.length === 0) return null;
  const pick = upcomingStarts.reduce((a, b) => (a.time <= b.time ? a : b));
  const evKey = eventKey(pick.event);
  const pickKey = `start:${evKey}:${pick.date}`;
  if (sessionDismissed.has(pickKey)) return null;
  if (prefs.display.permanentlyHiddenEventHeroes?.includes(evKey)) return null;
  const startCal = toCalendarDate(pick.date);
  return (
    <HeroShell
      label="Up next"
      onDismissOnce={() => dismissThisSession(pickKey)}
      menuItems={alertMenuItems(pick.event, evKey)}
      headline={
        <>
          <span className="font-semibold">{pick.event.abbreviation}</span>{" "}
          {pick.event.type} starts{" "}
          <em
            style={{
              fontStyle: "normal",
              color: "var(--accent)",
              fontWeight: 600,
            }}
          >
            {humanCountdown(pick.date, now)}
          </em>
          .
        </>
      }
      footer={
        startCal
          ? `${monDayYearFmt.format(startCal)}${
              pick.event.location ? ` · ${pick.event.location}` : ""
            }`
          : undefined
      }
    />
  );
}

function IntroHero({ totalActive }: { totalActive: number }) {
  const { prefs, setPrefs, prefsLoaded } = usePreferences();
  if (!prefsLoaded || prefs.display.introHeroDismissed) return null;
  const dismiss = () =>
    setPrefs((p) => ({
      ...p,
      display: { ...p.display, introHeroDismissed: true },
    }));
  return (
    <section
      className="relative mx-5 mt-8 border border-rule p-5 sm:p-7 md:mx-8"
      style={{ background: "var(--card)" }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide introduction"
        title="Hide"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
      >
        <X size={16} strokeWidth={1.75} />
      </button>
      <p className="pr-10 font-display text-[15px] leading-[1.45] text-ink-2 sm:text-[16px]">
        A small index of{" "}
        <span className="not-italic font-medium text-ink">{totalActive}</span>{" "}
        programming-language conferences, workshops, and symposia.
      </p>

      <div className="mt-5 space-y-4 border-t border-rule pt-5 sm:space-y-5 sm:pt-6">
        <IntroStep
          icon={<Star size={20} strokeWidth={1.75} fill="currentColor" />}
          title="Star events to keep track of their deadlines."
          sub="Tap the star on any row to follow it — your list stays in this browser."
        />
        <IntroStep
          icon={<Calendar size={20} strokeWidth={1.75} />}
          title="Subscribe to keep their dates in your calendar."
          sub="Use the calendar icon for a Google Calendar link, an .ics download, or a live feed."
        />
      </div>
    </section>
  );
}

function IntroStep({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      <div
        aria-hidden
        className="grid h-11 w-11 shrink-0 place-items-center rounded-pill sm:h-12 sm:w-12"
        style={{
          background: "color-mix(in srgb, var(--accent) 14%, var(--card))",
          color: "var(--accent)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[17px] font-medium leading-[1.3] text-ink sm:text-[19px]">
          {title}
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-2">{sub}</p>
      </div>
    </div>
  );
}

function HeroShell({
  label,
  headline,
  footer,
  footerTitle,
  onDismissOnce,
  menuItems,
}: {
  label: string;
  headline: React.ReactNode;
  footer?: string;
  footerTitle?: string;
  onDismissOnce?: () => void;
  menuItems?: {
    label: string;
    description?: string;
    onSelect: () => void;
  }[];
}) {
  return (
    <section
      className="relative mx-5 mt-8 border border-rule p-5 sm:p-7 md:mx-8"
      style={{ background: "var(--card)" }}
    >
      {(onDismissOnce || (menuItems && menuItems.length > 0)) && (
        <div className="absolute right-3 top-3 flex items-center gap-0.5">
          {menuItems && menuItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Alert options"
                title="More options"
                className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink data-[state=open]:bg-paper-2 data-[state=open]:text-ink"
              >
                <MoreHorizontal size={16} strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="max-w-[280px] border-rule text-ink shadow-pop"
                style={{ background: "var(--card)" }}
              >
                {menuItems.map((item, i) => (
                  <DropdownMenuItem
                    key={i}
                    onSelect={item.onSelect}
                    className="flex cursor-pointer flex-col items-start gap-0.5 rounded-sm text-[13px] text-ink focus:bg-paper-2 focus:text-ink"
                  >
                    <span className="font-medium text-ink">{item.label}</span>
                    {item.description && (
                      <span className="text-[11px] text-ink-3">
                        {item.description}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onDismissOnce && (
            <button
              type="button"
              onClick={onDismissOnce}
              aria-label="Dismiss this alert"
              title="Hide for this session (returns next time you visit)"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      )}
      <p className="label-cap mb-3.5 flex items-center gap-2">{label}</p>
      <h1 className="pr-20">{headline}</h1>
      {footer && (
        <div
          className="mt-4 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3"
          title={footerTitle}
        >
          {footer}
        </div>
      )}
    </section>
  );
}

function SearchPill({
  value,
  setValue,
}: {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
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

function FilterChips({
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

function ViewTabs({
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
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-rule px-5 pt-8 md:px-8">
      <div className="-mx-5 flex flex-1 gap-1 overflow-x-auto overflow-y-hidden px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(t.key)}
              className={clsx(
                "-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent bg-transparent px-3.5 py-2.5 text-[13px] font-medium transition-colors",
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
                  "font-mono text-[11px]",
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

function LayoutToggle({
  layout,
  setLayout,
}: {
  layout: "list" | "grid";
  setLayout: (next: "list" | "grid") => void;
}) {
  const options: {
    key: "list" | "grid";
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

function EventListInner({ events }: { events: ScheduledEvent[] }) {
  const { prefs, setPrefs, prefsLoaded } = usePreferences();
  const layout = prefs.display.layout ?? "list";
  const setLayout = (next: "list" | "grid") =>
    setPrefs((p) => ({ ...p, display: { ...p.display, layout: next } }));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [view, setView, viewLoaded] = useSessionState<View>(
    SESSION_VIEW_KEY,
    "starred"
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const starredKeys = useMemo(
    () =>
      new Set(
        Object.entries(prefs.eventPrefs)
          .filter(([, v]) => v?.favorite)
          .map(([k]) => k)
      ),
    // useLocalStorage's mergeDeep mutates prefs.eventPrefs in place during
    // hydration, so depend on the outer prefs object to catch new keys.
    [prefs]
  );

  const visibleEvents = useMemo(
    () =>
      events.filter((e) => !(prefs.eventPrefs[eventKey(e)]?.hidden === true)),
    [events, prefs]
  );

  const activeEvents = useMemo(
    () => applyFilters(visibleEvents, [isActive]),
    [visibleEvents]
  );

  const categoryCounts = useMemo<Record<Category, number>>(() => {
    const counts = activeEvents.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<ScheduledEvent["type"], number>
    );
    return {
      all: activeEvents.length,
      conference: counts.conference ?? 0,
      workshop: counts.workshop ?? 0,
      symposium: counts.symposium ?? 0,
      school: 0,
    };
  }, [activeEvents]);

  const baseFiltered = useMemo(
    () =>
      applyFilters(activeEvents, [
        (e) => (category === "all" ? true : e.type === category),
        search ? matchesText(search) : () => true,
      ]),
    [activeEvents, category, search]
  );

  const viewCounts = useMemo<Record<View, number>>(
    () => ({
      starred: baseFiltered.filter((e) => starredKeys.has(eventKey(e))).length,
      all: baseFiltered.length,
      submissions: baseFiltered.filter(hasOpenSubmission).length,
    }),
    [baseFiltered, starredKeys]
  );

  const displayEvents = useMemo(() => {
    const filtered = baseFiltered.filter((e) => {
      if (view === "starred") return starredKeys.has(eventKey(e));
      if (view === "submissions") return hasOpenSubmission(e);
      return true;
    });
    const decorated = filtered.map((e) => ({
      e,
      time: findNextDeadline(e, now)?.time,
    }));
    decorated.sort((a, b) => {
      if (a.time !== undefined && b.time !== undefined) return a.time - b.time;
      if (a.time !== undefined) return -1;
      if (b.time !== undefined) return 1;
      return a.e.abbreviation.localeCompare(b.e.abbreviation);
    });
    return decorated.map((d) => d.e);
  }, [baseFiltered, view, starredKeys, now]);

  const dueThisWeek = useMemo(
    () => displayEvents.filter((e) => isDueThisWeek(e, now)).length,
    [displayEvents, now]
  );
  const groups = useMemo(
    () => buildGroups(displayEvents, now),
    [displayEvents, now]
  );
  const totalActive = activeEvents.length;
  const starredCount = starredKeys.size;
  const hasOthers = view === "starred" && totalActive > starredCount;

  const didInitView = useRef(false);
  useEffect(() => {
    if (!prefsLoaded || !viewLoaded || didInitView.current) return;
    didInitView.current = true;
    const hasStored =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(SESSION_VIEW_KEY) !== null;
    if (!hasStored && starredCount === 0) setView("all");
  }, [prefsLoaded, viewLoaded, starredCount]);

  const lastUpdatedDate = useMemo(() => {
    const dates = events
      .map((e) => e.lastUpdated)
      .filter((d): d is string => typeof d === "string");
    if (dates.length === 0) return undefined;
    return dates.reduce((max, d) => (d > max ? d : max));
  }, [events]);

  return (
    <>
      {prefsLoaded && (
        <Hero
          events={visibleEvents}
          starredKeys={starredKeys}
          now={now}
          totalActive={totalActive}
        />
      )}

      <div className="flex flex-col gap-2 px-5 pt-7 sm:flex-row sm:flex-wrap sm:items-center md:px-8">
        <SearchPill value={search} setValue={setSearch} />
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            active={category}
            counts={categoryCounts}
            onSelect={setCategory}
          />
        </div>
      </div>

      <ViewTabs
        active={view}
        counts={viewCounts}
        onSelect={setView}
        trailing={
          <>
            <span className="hidden text-[13px] text-ink-3 lg:inline">
              sorted by next deadline ·{" "}
              <b className="font-medium text-ink-2">{dueThisWeek}</b> deadline
              {dueThisWeek === 1 ? "" : "s"} this week
            </span>
            <LayoutToggle layout={layout} setLayout={setLayout} />
          </>
        }
      />

      <div
        className={clsx(
          "px-5 md:px-8",
          layout === "grid" &&
            "mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
        )}
      >
        {prefsLoaded ? (
          displayEvents.length > 0 ? (
            layout === "grid" ? (
              displayEvents.map((e) => (
                <EventCard key={eventKey(e)} event={e} now={now} />
              ))
            ) : (
              groups.map((g) => (
                <section key={g.key} className="relative">
                  <DeadlineGroupHeader
                    date={g.date}
                    count={g.events.length}
                    now={now}
                  />
                  {g.events.map((e, i) => (
                    <div
                      key={eventKey(e)}
                      className={clsx(
                        "@container/row",
                        i === 0 && "[&>*]:border-t-0"
                      )}
                    >
                      <EventRow
                        event={e}
                        now={now}
                        hideDate={g.date !== null}
                      />
                    </div>
                  ))}
                </section>
              ))
            )
          ) : view === "starred" ? null : (
            <div className="py-8 text-[13px] text-ink-3">
              No events match these filters.
            </div>
          )
        ) : (
          <div className="space-y-4 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xs" />
            ))}
          </div>
        )}
      </div>

      {view === "starred" &&
        prefsLoaded &&
        (starredCount === 0 || hasOthers) && (
          <div className="mx-5 mt-8 flex flex-col items-start gap-4 border border-dashed border-rule p-5 sm:p-7 md:mx-8 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-6">
            <div className="text-[13px] text-ink-2">
              {starredCount === 0 ? (
                <>
                  Nothing starred yet —{" "}
                  <b className="font-semibold text-ink">{totalActive} events</b>{" "}
                  tracked across conferences, workshops, and symposia. Tap the
                  star icon on any row to follow it.
                </>
              ) : (
                <>
                  Looking for something else?{" "}
                  <b className="font-semibold text-ink">{totalActive} events</b>{" "}
                  tracked across conferences, workshops, and symposia.
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setView("all")}
              className="inline-flex h-[38px] flex-shrink-0 items-center gap-2 rounded-pill bg-ink px-4 text-[13px] font-medium text-paper transition-colors hover:bg-[color:var(--accent)]"
            >
              Browse all events →
            </button>
          </div>
        )}

      <footer className="mt-14 flex items-center justify-end gap-6 border-t border-rule px-5 py-6 text-[12px] text-ink-3 md:px-8">
        <span>
          {totalActive} events tracked
          {lastUpdatedDate && (
            <>
              {" "}
              · last updated <LastUpdated date={lastUpdatedDate} />
            </>
          )}
        </span>
      </footer>
    </>
  );
}

export function EventListContainer({ events }: { events: ScheduledEvent[] }) {
  return (
    <PreferencesProvider>
      <EventListInner events={events} />
    </PreferencesProvider>
  );
}
