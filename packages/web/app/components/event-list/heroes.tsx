"use client";

import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MoreHorizontal, X } from "lucide-react";
import { dateNames } from "../../lib/event";
import { humanCountdown } from "../../lib/countdown";
import type { HeroEvent } from "../../lib/event-list-view";
import { formatDate, localDeadlineString } from "../../lib/date-formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useDisplayPref, useEventPrefs } from "../../hooks/use-preferences";
import { setDisplayPref } from "../../lib/preferences-store";
import { collectStarredKeys } from "../../lib/user-prefs";
import { useSessionStorageStringSet } from "../../hooks/use-session-storage";
import { useNow } from "./now-provider";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HERO_CUTOFF_DAYS = 14;
const HERO_TRANSITION_MS = 300;
const SESSION_DISMISSED_KEY = "dismissedHeroKeys";

export function Hero({ events }: { events: HeroEvent[] }) {
  const now = useNow();
  const eventPrefs = useEventPrefs();
  const deadlineHeroDismissed = useDisplayPref("deadlineHeroDismissed");
  const permanentlyHiddenEventHeroes = useDisplayPref(
    "permanentlyHiddenEventHeroes"
  );
  const starredKeys = useMemo(
    () => collectStarredKeys(eventPrefs),
    [eventPrefs]
  );
  const [sessionDismissed, setSessionDismissed] = useSessionStorageStringSet(
    SESSION_DISMISSED_KEY
  );
  const dismissThisSession = (key: string) =>
    setSessionDismissed((prev) => new Set(prev).add(key));
  const hideEventForever = (key: string) =>
    setDisplayPref("permanentlyHiddenEventHeroes", (prev) =>
      Array.from(new Set([...prev, key]))
    );
  const dismissAllAlerts = () => setDisplayPref("deadlineHeroDismissed", true);
  const alertMenuItems = (event: HeroEvent) => [
    {
      label: `Hide alerts for ${event.abbreviation}`,
      description: "Always hide this event's deadline cards.",
      onSelect: () => hideEventForever(event.key),
    },
    {
      label: "Stop showing deadline alerts",
      description: "Permanently hides this card for every event.",
      onSelect: dismissAllAlerts,
    },
  ];
  const { upcomingDeadlines, upcomingStarts } = useMemo(() => {
    const nowMs = now.getTime();
    const horizon = nowMs + HERO_CUTOFF_DAYS * MS_PER_DAY;
    const starred = events.filter((e) => starredKeys.has(e.key));
    return {
      upcomingDeadlines: starred.flatMap((event) => {
        // Pick the next deadline still in the future as of live `now`. The
        // server may have shipped a Round 1 deadline that has since elapsed;
        // walking the sorted list rolls forward to Round 2 automatically.
        const d = event.upcomingDeadlines.find((d) => d.time >= nowMs);
        return d && d.time <= horizon
          ? [{ event, date: d.date, name: d.name, time: d.time }]
          : [];
      }),
      upcomingStarts: starred.flatMap((event) => {
        const s = event.upcomingStart;
        return s && s.time >= nowMs && s.time <= horizon
          ? [{ event, date: s.date, time: s.time }]
          : [];
      }),
    };
  }, [events, starredKeys, now]);

  const content = pickHero();

  return <HeroSlot>{content}</HeroSlot>;

  function pickHero(): ReactNode {
    if (starredKeys.size === 0) return null;
    if (deadlineHeroDismissed) return null;

    if (upcomingDeadlines.length > 0) {
      const pick = upcomingDeadlines.reduce((a, b) =>
        a.time <= b.time ? a : b
      );
      const pickKey = `deadline:${pick.event.key}:${pick.name}:${pick.date}`;
      if (sessionDismissed.has(pickKey)) return null;
      if (permanentlyHiddenEventHeroes.includes(pick.event.key)) return null;
      const { deadline, short } = dateNames[pick.name];
      return (
        <HeroShell
          label={deadline ? "Your next deadline" : "Coming up"}
          onDismissOnce={() => dismissThisSession(pickKey)}
          menuItems={alertMenuItems(pick.event)}
          headline={
            <>
              <span className="font-semibold">
                {pick.event.abbreviation} {short.toLowerCase()}
              </span>{" "}
              {deadline ? "is due " : ""}
              <em className="not-italic">{humanCountdown(pick.date, now)}</em>.
            </>
          }
          footer={localDeadlineString(pick.date)}
          footerTitle={`${pick.date} · 23:59 AoE`}
        />
      );
    }

    if (upcomingStarts.length === 0) return null;
    const pick = upcomingStarts.reduce((a, b) => (a.time <= b.time ? a : b));
    const pickKey = `start:${pick.event.key}:${pick.date}`;
    if (sessionDismissed.has(pickKey)) return null;
    if (permanentlyHiddenEventHeroes.includes(pick.event.key)) return null;
    return (
      <HeroShell
        label="Up next"
        onDismissOnce={() => dismissThisSession(pickKey)}
        menuItems={alertMenuItems(pick.event)}
        headline={
          <>
            <span className="font-semibold">{pick.event.abbreviation}</span>{" "}
            {pick.event.type} starts{" "}
            <em className="not-italic font-semibold text-accent">
              {humanCountdown(pick.date, now)}
            </em>
            .
          </>
        }
        footer={`${formatDate(pick.date, "monDayYear")}${
          pick.event.location ? ` · ${pick.event.location}` : ""
        }`}
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
      className="flex items-center overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
      style={{ height: open ? contentHeight : 0 }}
      aria-hidden={!open}
    >
      <div
        ref={innerRef}
        className="w-full pt-8 transition-opacity duration-300 ease-out motion-reduce:transition-none"
        style={{ opacity: open ? 1 : 0 }}
      >
        {rendered}
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
    <section className="relative mx-5 border border-rule bg-card p-5 sm:p-7 md:mx-8">
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
                className="max-w-[280px] rounded-md"
              >
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onSelect={item.onSelect}
                    className="flex-col items-start gap-0.5 rounded-sm px-2 py-1.5"
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
          className="mt-4 font-mono text-[11px] tracking-[0.04em] text-ink-3"
          title={footerTitle}
          suppressHydrationWarning
        >
          {footer}
        </div>
      )}
    </section>
  );
}
