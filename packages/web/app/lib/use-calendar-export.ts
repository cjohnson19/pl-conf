"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasConcreteDates,
  icalFeedPath,
  icalFileName,
  toGoogleCalendarLink,
  type ScheduledEvent,
} from "./event";
import { usePreferences } from "@/components/preferences-provider";

export type SubscribeUrls = {
  httpsUrl: string;
  webcalUrl: string;
  googleSubscribeUrl: string;
};

export type CalendarExport = {
  datesTBD: boolean;
  hasOpened: boolean;
  setHasOpened: (v: boolean) => void;
  includeDeadlines: boolean;
  setIncludeDeadlines: (v: boolean) => void;
  copied: boolean;
  copyFeedUrl: () => void;
  icsUrl: string | null;
  fileName: string;
  gcalHref: string | null;
  subscribeUrls: SubscribeUrls | null;
};

export function useCalendarExport(event: ScheduledEvent): CalendarExport {
  const { prefs, setPrefs } = usePreferences();
  const includeDeadlines = prefs.display.includeCalendarDeadlines;
  const setIncludeDeadlines = (v: boolean) =>
    setPrefs((prev) => ({
      ...prev,
      display: { ...prev.display, includeCalendarDeadlines: v },
    }));
  const [hasOpened, setHasOpened] = useState(false);
  const [copied, setCopied] = useState(false);
  const datesTBD = !hasConcreteDates(event);

  const [icsUrl, setIcsUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasOpened || datesTBD) {
      setIcsUrl(null);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      const { toICal } = await import("@pl-conf/core/ical");
      if (cancelled) return;
      const ics = toICal(event, includeDeadlines);
      if (!ics) return;
      createdUrl = URL.createObjectURL(
        new Blob([ics], { type: "text/calendar" })
      );
      setIcsUrl(createdUrl);
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [hasOpened, event, includeDeadlines, datesTBD]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const fileName = icalFileName(event, includeDeadlines);
  const feedPath = icalFeedPath(event, includeDeadlines);

  const subscribeUrls = useMemo<SubscribeUrls | null>(() => {
    if (!hasOpened || datesTBD || typeof window === "undefined") return null;
    const host = window.location.host;
    // Google Calendar's add-by-URL flow only accepts http:// in `cid`; it
    // silently rejects https://. CloudFront serves both schemes.
    return {
      httpsUrl: `https://${host}${feedPath}`,
      webcalUrl: `webcal://${host}${feedPath}`,
      googleSubscribeUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`http://${host}${feedPath}`)}`,
    };
  }, [hasOpened, datesTBD, feedPath]);

  const gcalHref = datesTBD ? null : toGoogleCalendarLink(event) || null;

  const copyFeedUrl = () => {
    if (!subscribeUrls) return;
    navigator.clipboard
      .writeText(subscribeUrls.httpsUrl)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  return {
    datesTBD,
    hasOpened,
    setHasOpened,
    includeDeadlines,
    setIncludeDeadlines,
    copied,
    copyFeedUrl,
    icsUrl,
    fileName,
    gcalHref,
    subscribeUrls,
  };
}
