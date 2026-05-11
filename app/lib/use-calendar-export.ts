"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasConcreteDates,
  icalFeedPath,
  icalFileName,
  toGoogleCalendarLink,
  toICal,
  type ScheduledEvent,
} from "./event";

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
  const [hasOpened, setHasOpened] = useState(false);
  const [includeDeadlines, setIncludeDeadlines] = useState(false);
  const [copied, setCopied] = useState(false);
  const datesTBD = !hasConcreteDates(event);

  const icsUrl = useMemo(() => {
    if (!hasOpened || datesTBD) return null;
    const ics = toICal(event, includeDeadlines);
    if (!ics) return null;
    return URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  }, [hasOpened, event, includeDeadlines, datesTBD]);

  useEffect(() => {
    if (!icsUrl) return;
    return () => URL.revokeObjectURL(icsUrl);
  }, [icsUrl]);

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
