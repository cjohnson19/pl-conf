import {
  type CalendarDate,
  type MaybeDate,
  aoeTime,
  calendarDate,
} from "./event";

// The locale the server renders dates in. Client components that display a
// date hydrate with this and then switch to the viewer's locale — see
// components/local-date.tsx.
export const SERVER_LOCALE = "en-US";

export const dateStyles = {
  short: { year: "numeric", month: "short", day: "numeric" },
  long: { year: "numeric", month: "long", day: "numeric" },
  monthShort: { month: "short" },
  monthLong: { month: "long" },
  monthDay: { month: "short", day: "numeric" },
  monDayYear: {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  },
  weekdayLong: { weekday: "long" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof dateStyles;

// Building an Intl.DateTimeFormat is measurably slow on the client (eight at
// module scope cost ~11ms of hydration), so they are built on first use.
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

export function formatDate(
  date: MaybeDate,
  style: DateStyle,
  locale?: string
): string {
  if (date === "TBD") return "TBD";
  return formatter(dateStyles[style], locale).format(calendarDate(date));
}

export function formatDateRange(
  start: MaybeDate,
  end: MaybeDate,
  style: DateStyle,
  locale?: string
): string {
  if (start === "TBD" || end === "TBD") return "TBD";
  return formatter(dateStyles[style], locale).formatRange(
    calendarDate(start),
    calendarDate(end)
  );
}

// The deadline's AoE instant in the viewer's own clock, for the hero footer.
export function localDeadlineString(date: CalendarDate): string {
  const instant = new Date(aoeTime(date));
  const dow = formatter({ weekday: "short" }).format(instant);
  const dat = formatter(dateStyles.monthDay).format(instant);
  const tim = formatter({ hour: "2-digit", minute: "2-digit" }).format(instant);
  const tz =
    formatter({ timeZoneName: "short" })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  return `${dow} · ${dat} · ${tim}${tz ? ` ${tz}` : ""} (local)`;
}
