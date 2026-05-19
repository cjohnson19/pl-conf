import {
  type DateName,
  type MaybeDate,
  toAoeInstant,
  toCalendarDate,
} from "./event";

export const dowFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
export const monthShortFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
});
export const monthDayFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
export const monDayYearFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
export const weekdayLongFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
});
export const monthLongFmt = new Intl.DateTimeFormat(undefined, {
  month: "long",
});
export const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
export const tzFmt = new Intl.DateTimeFormat(undefined, {
  timeZoneName: "short",
});

export function monthShort(date: MaybeDate): string {
  if (date === "TBD") return "TBD";
  const cal = toCalendarDate(date);
  return cal ? monthShortFmt.format(cal) : "TBD";
}

export function dayNum(date: MaybeDate): string {
  if (date === "TBD") return "—";
  const cal = toCalendarDate(date);
  return cal ? cal.getDate().toString() : "—";
}

export function yearNum(date: MaybeDate): string {
  if (date === "TBD") return "";
  const cal = toCalendarDate(date);
  return cal ? cal.getFullYear().toString() : "";
}

export function roundShortDate(date: MaybeDate): string {
  if (date === "TBD") return "TBD";
  const cal = toCalendarDate(date);
  return cal ? monthDayFmt.format(cal) : "TBD";
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
  const dow = dowFmt.format(instant);
  const dat = monthDayFmt.format(instant);
  const tim = timeFmt.format(instant);
  const tz =
    tzFmt.formatToParts(instant).find((p) => p.type === "timeZoneName")
      ?.value ?? "";
  return `${dow} · ${dat} · ${tim}${tz ? ` ${tz}` : ""} (local)`;
}
