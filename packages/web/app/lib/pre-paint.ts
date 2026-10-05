// Runs inline in <head> before anything renders: layout.tsx embeds
// `prePaint.toString()`, so this function must stay self-contained — no
// imports, no closures, nothing outside its own body. It applies what the
// browser already knows (saved prefs, the URL) as CSS so the first paint
// matches the user's state instead of flashing every row until hydration.
// Hydrated components then take over: lib/list-visibility.ts emits the same
// row/group rules, and the star delegate restyles starred buttons.
export function prePaint() {
  try {
    const nav = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const uaStr = `${navigator.userAgent || ""} ${navigator.platform || ""}`;
    if (
      nav.userAgentData?.platform === "macOS" ||
      /Mac|iPhone|iPad|iPod/i.test(uaStr)
    ) {
      document.documentElement.dataset.os = "mac";
    }

    const esc = (s: string) => s.replace(/[\\"]/g, "\\$&");
    const addStyle = (id: string, css: string) => {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
    };

    const view = new URLSearchParams(window.location.search).get("view");
    let prefs: {
      display?: { collapseHintDismissed?: boolean };
      eventPrefs?: Record<string, { favorite?: boolean } | undefined>;
    } | null = null;
    try {
      const raw = localStorage.getItem("userPrefsV2");
      prefs = raw ? JSON.parse(raw) : null;
    } catch {}

    let rules = "";
    // The collapse hint is server-rendered so first paint reserves its space;
    // dismissed visitors must never see it.
    if (prefs?.display?.collapseHintDismissed) {
      rules += "[data-collapse-hint]{display:none}";
    }
    const starred = Object.entries(prefs?.eventPrefs ?? {})
      .filter(([, v]) => v?.favorite)
      .map(([k]) => k);
    if (view === "starred") {
      if (starred.length === 0) {
        rules +=
          "[data-event-key]{display:none}[data-group-keys]{display:none}";
      } else {
        const sel = starred
          .map((k) => `[data-event-key="${esc(k)}"]`)
          .join(",");
        rules += `[data-event-key]:not(${sel}){display:none}`;
        rules += `[data-group-keys]:not(:has(${sel})){display:none}`;
      }
    }
    if (view === "submissions") {
      rules += "[data-event-key]:not([data-has-open-submission]){display:none}";
      rules +=
        "[data-group-keys]:not(:has([data-has-open-submission])){display:none}";
    }
    if (rules) addStyle("pl-prepaint-visibility", rules);

    if (starred.length > 0) {
      const starSel = starred
        .map((k) => `[data-pl-star][data-pref-key="${esc(k)}"]`)
        .join(",");
      addStyle(
        "pl-prepaint-stars",
        `${starSel}{color:var(--accent)}${starSel} svg{fill:currentColor}`
      );
      document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(starSel).forEach((b) => {
          const k = b.getAttribute("data-pref-key") ?? "";
          b.setAttribute("aria-pressed", "true");
          b.setAttribute("aria-label", `Unstar ${k}`);
          b.setAttribute("title", "Starred");
        });
      });
    }
  } catch {}
}
