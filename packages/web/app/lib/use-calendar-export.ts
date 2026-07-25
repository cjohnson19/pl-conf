"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasConcreteDates,
  icalFeedPath,
  icalFileName,
  toGoogleCalendarLink,
} from "./event";
import type { DisplayEvent } from "./event-list-view";
import { setPrefs, useDisplayPref } from "@/components/preferences-provider";

export type SubscribeUrls = {
  httpsUrl: string;
  webcalUrl: string;
  googleSubscribeUrl: string;
};

export type CalendarExport = {
  datesTBD: boolean;
  includeDeadlines: boolean;
  setIncludeDeadlines: (v: boolean) => void;
  copied: boolean;
  copyFeedUrl: () => void;
  icsUrl: string | undefined;
  fileName: string;
  gcalHref: string | undefined;
  subscribeUrls: SubscribeUrls | undefined;
};

export function useCalendarExport(event: DisplayEvent): CalendarExport {
  const includeDeadlines = useDisplayPref("includeCalendarDeadlines");
  const setIncludeDeadlines = (v: boolean) =>
    setPrefs((prev) => ({
      ...prev,
      display: { ...prev.display, includeCalendarDeadlines: v },
    }));
  const [copied, setCopied] = useState(false);
  const datesTBD = !hasConcreteDates(event);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const fileName = icalFileName(event, includeDeadlines);
  // `prebuild` already writes both variants of every feed to public/ical/, so
  // the download links at the static file rather than pulling the `ics` package
  // into the browser to rebuild identical bytes as a blob.
  const feedPath = icalFeedPath(event, includeDeadlines);

  const subscribeUrls = useMemo<SubscribeUrls | undefined>(() => {
    if (datesTBD || typeof window === "undefined") return undefined;
    const host = window.location.host;
    // Google Calendar's add-by-URL flow only accepts http:// in `cid`; it
    // silently rejects https://. CloudFront serves both schemes.
    return {
      httpsUrl: `https://${host}${feedPath}`,
      webcalUrl: `webcal://${host}${feedPath}`,
      googleSubscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`http://${host}${feedPath}`)}`,
    };
  }, [datesTBD, feedPath]);

  const gcalHref = datesTBD
    ? undefined
    : toGoogleCalendarLink(event) || undefined;

  const copyFeedUrl = () => {
    if (!subscribeUrls) return;
    navigator.clipboard
      .writeText(subscribeUrls.httpsUrl)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  return {
    datesTBD,
    includeDeadlines,
    setIncludeDeadlines,
    copied,
    copyFeedUrl,
    icsUrl: datesTBD ? undefined : feedPath,
    fileName,
    gcalHref,
    subscribeUrls,
  };
}
