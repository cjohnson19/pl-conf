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
import { Calendar, Command, Search } from "lucide-react";
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
import {
  applyFilters,
  isActive,
  matchesText,
  openToNewSubmissions,
} from "../lib/event-filter";
import { PreferencesProvider, usePreferences } from "./preferences-provider";
import { EventRow } from "./event-row";
import { Skeleton } from "./ui/skeleton";
import { LastUpdated } from "./last-updated";

const hasOpenSubmission = openToNewSubmissions(true);

type Category = "all" | "conference" | "workshop" | "symposium" | "school";
type View = "watching" | "all" | "submissions";

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

function humanCountdown(date: string, now: Date): string {
  const instant = toAoeInstant(date);
  if (!instant) return "soon";
  const ms = instant.getTime() - now.getTime();
  if (ms <= 0) return "passed";
  if (ms < 86_400_000) {
    const totalMinutes = Math.floor(ms / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hPart = `${hours} ${hours === 1 ? "hour" : "hours"}`;
    const mPart = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    if (hours === 0) return mPart;
    if (minutes === 0) return hPart;
    return `${hPart} ${mPart}`;
  }
  const days = Math.round(ms / 86_400_000);
  if (days === 1) return "1 day";
  if (days < 14) return `${days} days`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? "1 year" : `${years} years`;
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

const monDayYearFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function Hero({
  events,
  watchingKeys,
  now,
  totalActive,
}: {
  events: ScheduledEvent[];
  watchingKeys: Set<string>;
  now: Date;
  totalActive: number;
}) {
  const { upcomingDeadlines, upcomingStarts } = useMemo(() => {
    const watched = events.filter((e) => watchingKeys.has(eventKey(e)));
    return {
      upcomingDeadlines: watched.flatMap((event) => {
        const lead = findNextDeadline(event, now);
        return lead
          ? [{ event, date: lead.date, name: lead.name, time: lead.time }]
          : [];
      }),
      upcomingStarts: watched.flatMap((event) => {
        const start = findNextStart(event, now);
        return start ? [{ event, date: start.date, time: start.time }] : [];
      }),
    };
  }, [events, watchingKeys, now]);

  if (watchingKeys.size === 0) {
    return <IntroHero totalActive={totalActive} />;
  }

  if (upcomingDeadlines.length > 0) {
    const pick = upcomingDeadlines.reduce((a, b) => (a.time <= b.time ? a : b));
    const deadline = isDeadline(pick.name);
    const urgent = isDeadlineUrgent(pick.date, now);
    return (
      <HeroShell
        accent={urgent ? "hot" : "accent"}
        label={deadline ? "Your next deadline" : "Coming up"}
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
              in {humanCountdown(pick.date, now)}
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
  const startCal = toCalendarDate(pick.date);
  return (
    <HeroShell
      accent="accent"
      label="Up next"
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
            in {humanCountdown(pick.date, now)}
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
  return (
    <section
      className="mx-5 mt-8 border border-rule p-5 sm:p-7 md:mx-8"
      style={{ background: "var(--card)" }}
    >
      <p className="font-display text-[15px] italic leading-[1.45] text-ink-2 sm:text-[16px]">
        A small index of{" "}
        <span className="not-italic font-medium text-ink">{totalActive}</span>{" "}
        programming-language conferences, workshops, and symposia.
      </p>

      <div className="mt-5 space-y-4 border-t border-rule pt-5 sm:space-y-5 sm:pt-6">
        <IntroStep
          icon={
            <svg
              viewBox="0 0 24 24"
              width={22}
              height={22}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx={12} cy={12} r={3} fill="currentColor" stroke="none" />
            </svg>
          }
          title="Watch events to keep an eye on their deadlines."
          sub="Tap the eye on any row to follow it — your list stays in this browser."
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
  accent,
  label,
  headline,
  footer,
  footerTitle,
}: {
  accent: "hot" | "accent";
  label: string;
  headline: React.ReactNode;
  footer?: string;
  footerTitle?: string;
}) {
  return (
    <section
      className="mx-5 mt-8 border border-rule p-5 sm:p-7 md:mx-8"
      style={{ background: "var(--card)" }}
    >
      <p className="label-cap mb-3.5 flex items-center gap-2">
        <span
          aria-hidden
          className={clsx(
            "inline-block h-[7px] w-[7px] rounded-full animate-pulse",
            accent === "hot"
              ? "bg-hot text-hot"
              : "bg-[color:var(--accent)] text-[color:var(--accent)]"
          )}
        />
        {label}
      </p>
      <h1>{headline}</h1>
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
      key: "watching",
      label: "Watching",
      icon: (
        <svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          style={{ color: "var(--accent)" }}
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx={12} cy={12} r={3} fill="currentColor" stroke="none" />
        </svg>
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
        <div className="hidden items-center gap-4 pb-2 lg:flex">{trailing}</div>
      )}
    </div>
  );
}

function EventListInner({ events }: { events: ScheduledEvent[] }) {
  const { prefs, prefsLoaded } = usePreferences();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [view, setView] = useState<View>("watching");
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

  const watchingKeys = useMemo(
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

  const viewCounts = useMemo<Record<View, number>>(() => {
    const filtered = applyFilters(activeEvents, [
      (e) => (category === "all" ? true : e.type === category),
      search ? matchesText(search) : () => true,
    ]);
    return {
      watching: filtered.filter((e) => watchingKeys.has(eventKey(e))).length,
      all: filtered.length,
      submissions: filtered.filter(hasOpenSubmission).length,
    };
  }, [activeEvents, category, search, watchingKeys]);

  const displayEvents = useMemo(() => {
    const filtered = applyFilters(activeEvents, [
      (e) => (category === "all" ? true : e.type === category),
      search ? matchesText(search) : () => true,
      (e) => {
        if (view === "watching") return watchingKeys.has(eventKey(e));
        if (view === "submissions") return hasOpenSubmission(e);
        return true;
      },
    ]);
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
  }, [activeEvents, category, search, view, watchingKeys, now]);

  const dueThisWeek = useMemo(
    () => displayEvents.filter((e) => isDueThisWeek(e, now)).length,
    [displayEvents, now]
  );
  const totalActive = activeEvents.length;
  const watchingCount = watchingKeys.size;
  const hasOthers = view === "watching" && totalActive > watchingCount;

  const didInitView = useRef(false);
  useEffect(() => {
    if (!prefsLoaded || didInitView.current) return;
    didInitView.current = true;
    if (watchingCount === 0) setView("all");
  }, [prefsLoaded, watchingCount]);

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
          watchingKeys={watchingKeys}
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
          <span className="text-[13px] text-ink-3">
            sorted by next deadline ·{" "}
            <b className="font-medium text-ink-2">{dueThisWeek}</b> deadline
            {dueThisWeek === 1 ? "" : "s"} this week
          </span>
        }
      />

      <div className="px-5 md:px-8 [&>*:first-child]:border-t-0">
        {prefsLoaded ? (
          displayEvents.length > 0 ? (
            displayEvents.map((e) => (
              <EventRow key={eventKey(e)} event={e} now={now} />
            ))
          ) : view === "watching" ? null : (
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

      {view === "watching" &&
        prefsLoaded &&
        (watchingCount === 0 || hasOthers) && (
          <div className="mx-5 mt-8 flex flex-col items-start gap-4 border border-dashed border-rule p-5 sm:p-7 md:mx-8 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-6">
            <div className="text-[13px] text-ink-2">
              {watchingCount === 0 ? (
                <>
                  Nothing watched yet —{" "}
                  <b className="font-semibold text-ink">{totalActive} events</b>{" "}
                  tracked across conferences, workshops, and symposia. Tap the
                  eye icon on any row to follow it.
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
