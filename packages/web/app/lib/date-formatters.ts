import {
  type DateName,
  type MaybeDate,
  toAoeInstant,
  toCalendarDate,
} from "./event";

// The locale the server renders dates in. Client components that display a
// date hydrate with this and then switch to the viewer's locale — see
// components/local-date.tsx.
export const SERVER_LOCALE = "en-US";

export const calendarStyles = {
  monthShort: { month: "short" },
  monthDay: { month: "short", day: "numeric" },
  monDayYear: {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  },
  weekdayLong: { weekday: "long" },
  monthLong: { month: "long" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type CalendarStyle = keyof typeof calendarStyles;

const formatters = new Map<string, Intl.DateTimeFormat>();

// `locale` undefined means the runtime's default: the viewer's browser on the
// client, the container on the server.
function formatter(
  options: Intl.DateTimeFormatOptions,
  locale?: string
): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let fmt = formatters.get(key);
  if (fmt === undefined) {
    fmt = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, fmt);
  }
  return fmt;
}

export function formatCal(
  cal: Date,
  style: CalendarStyle,
  locale?: string
): string {
  return formatter(calendarStyles[style], locale).format(cal);
}

export function formatCalendar(
  date: MaybeDate,
  style: CalendarStyle,
  locale?: string
): string {
  const cal = toCalendarDate(date);
  return cal ? formatCal(cal, style, locale) : "TBD";
}

export function monthShort(date: MaybeDate): string {
  return formatCalendar(date, "monthShort");
}

export function dayNum(date: MaybeDate): string {
  const cal = toCalendarDate(date);
  return cal ? cal.getDate().toString() : "—";
}

export function yearNum(date: MaybeDate): string {
  const cal = toCalendarDate(date);
  return cal ? cal.getFullYear().toString() : "";
}

export function roundShortDate(date: MaybeDate): string {
  return formatCalendar(date, "monthDay");
}

export function dateNameShort(n: DateName): string {
  switch (n) {
    case "paper":
      return "Paper";
    case "abstract":
      return "Abstract";
    case "notification":
      return "Notification";
    case "rebuttal":
      return "Rebuttal";
    case "conditional-acceptance":
      return "Conditional Acceptance";
    case "camera-ready":
      return "Camera-ready";
    case "revisions":
      return "Revisions";
  }
}

export function deadlineKindWord(name: DateName): string {
  switch (name) {
    case "paper":
      return "paper";
    case "abstract":
      return "abstract";
    case "notification":
      return "notification";
    case "rebuttal":
      return "rebuttal";
    case "conditional-acceptance":
      return "conditional acceptance";
    case "camera-ready":
      return "camera-ready";
    case "revisions":
      return "revisions";
  }
}

export function localDeadlineString(date: string): string {
  const instant = toAoeInstant(date);
  if (!instant) return "";
  const dow = formatter({ weekday: "short" }).format(instant);
  const dat = formatter(calendarStyles.monthDay).format(instant);
  const tim = formatter({ hour: "2-digit", minute: "2-digit" }).format(instant);
  const tz =
    formatter({ timeZoneName: "short" })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  return `${dow} · ${dat} · ${tim}${tz ? ` ${tz}` : ""} (local)`;
}
