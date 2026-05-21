"use client";

import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Calendar, MoreHorizontal, Star, X } from "lucide-react";
import {
  type ScheduledEvent,
  eventKey,
  isDeadline,
  isDeadlineUrgent,
  toCalendarDate,
} from "../../lib/event";
import { humanCountdown } from "../../lib/countdown";
import { findNextDeadline, findNextStart } from "../../lib/deadline";
import {
  deadlineKindWord,
  localDeadlineString,
  monDayYearFmt,
} from "../../lib/date-formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDismissedHeroKeys, usePreferences } from "../preferences-provider";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HERO_CUTOFF_DAYS = 14;
const HERO_TRANSITION_MS = 300;

export function Hero({
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
  const {
    dismissedHeroKeys: sessionDismissed,
    dismissHero: dismissThisSession,
  } = useDismissedHeroKeys();
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
  const dismissIntro = () =>
    setPrefs((p) => ({
      ...p,
      display: { ...p.display, introHeroDismissed: true },
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

  const content = pickHero();

  return <HeroSlot>{content}</HeroSlot>;

  function pickHero(): ReactNode {
    if (!prefsLoaded) return null;

    if (starredKeys.size === 0) {
      if (prefs.display.introHeroDismissed) return null;
      return <IntroHero totalActive={totalActive} onDismiss={dismissIntro} />;
    }

    if (prefs.display.deadlineHeroDismissed) return null;

    if (upcomingDeadlines.length > 0) {
      const pick = upcomingDeadlines.reduce((a, b) =>
        a.time <= b.time ? a : b
      );
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
    if (prefs.display.permanentlyHiddenEventHeroes?.includes(evKey))
      return null;
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
}

function HeroSlot({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<ReactNode>(null);
  const [open, setOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (children) {
      setRendered(children);
      const id = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setOpen(false);
    const t = setTimeout(() => setRendered(null), HERO_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [children]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run after `rendered` flips from null to non-null so the ref is populated
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rendered]);

  if (!rendered) return null;

  return (
    <div
      className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
      style={{ height: open ? contentHeight : 0 }}
      aria-hidden={!open}
    >
      <div
        ref={innerRef}
        className="pt-8 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-8px)",
        }}
      >
        {rendered}
      </div>
    </div>
  );
}

function IntroHero({
  totalActive,
  onDismiss,
}: {
  totalActive: number;
  onDismiss: () => void;
}) {
  return (
    <section
      data-hero-slot="intro"
      className="relative mx-5 border border-rule p-5 sm:p-7 md:mx-8"
      style={{ background: "var(--card)" }}
    >
      <button
        type="button"
        onClick={onDismiss}
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
      className="relative mx-5 border border-rule p-5 sm:p-7 md:mx-8"
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
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
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
          suppressHydrationWarning
        >
          {footer}
        </div>
      )}
    </section>
  );
}
