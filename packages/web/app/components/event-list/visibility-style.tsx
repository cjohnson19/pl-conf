"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { eventKeySelector } from "../../lib/row-css";
import { collectStarredKeys } from "../../lib/user-prefs";
import { useEventPrefs, usePrefsLoaded } from "../preferences-provider";

const PREPAINT_STYLE_ID = "pl-prepaint-visibility";

export function VisibilityStyle() {
  const eventPrefs = useEventPrefs();
  const prefsLoaded = usePrefsLoaded();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  const rules = useMemo(() => {
    let css = "";
    if (view === "submissions") {
      css += "[data-event-key]:not([data-has-open-submission]){display:none}";
      css +=
        "[data-group-keys]:not(:has([data-has-open-submission])){display:none}";
    }
    if (!prefsLoaded) return css;
    if (view === "starred") {
      const starred = Array.from(collectStarredKeys(eventPrefs));
      if (starred.length === 0) {
        css += "[data-event-key]{display:none}[data-group-keys]{display:none}";
      } else {
        const sel = starred.map(eventKeySelector).join(",");
        css += `[data-event-key]:not(${sel}){display:none}`;
        css += `[data-group-keys]:not(:has(${sel})){display:none}`;
      }
    }
    return css;
  }, [eventPrefs, prefsLoaded, view]);

  useEffect(() => {
    if (!prefsLoaded) return;
    document.getElementById(PREPAINT_STYLE_ID)?.remove();
  }, [prefsLoaded]);

  if (!rules) return null;
  return <style>{rules}</style>;
}
