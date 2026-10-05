"use client";

import { useEffect } from "react";
import { preferencesStore, toggleFavorite } from "@/lib/preferences-store";
import { starSelector } from "@/lib/row-css";
import { collectStarredKeys } from "@/lib/user-prefs";

const SELECTOR = "[data-pl-star]";
const STYLE_ID = "pl-stars";
const PREPAINT_STYLE_ID = "pl-prepaint-stars";

function findButton(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(starSelector(key));
}

const collectStarred = () =>
  collectStarredKeys(preferencesStore.getPrefs().eventPrefs);

// Replaces ~97 hydrated FavoriteButton islands with a single click listener
// and a single <style> element that gets diff-updated from the prefs store.
export function StarDelegate() {
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
    document.getElementById(PREPAINT_STYLE_ID)?.remove();

    let prev = new Set<string>();
    const apply = () => {
      const next = collectStarred();
      for (const k of prev) {
        if (!next.has(k)) {
          const btn = findButton(k);
          btn?.setAttribute("aria-pressed", "false");
          btn?.setAttribute("aria-label", `Star ${k}`);
          btn?.setAttribute("title", "Star");
        }
      }
      for (const k of next) {
        if (!prev.has(k)) {
          const btn = findButton(k);
          btn?.setAttribute("aria-pressed", "true");
          btn?.setAttribute("aria-label", `Unstar ${k}`);
          btn?.setAttribute("title", "Starred");
        }
      }
      if (next.size === 0) {
        styleEl.textContent = "";
      } else {
        const sel = Array.from(next).map(starSelector).join(",");
        styleEl.textContent = `${sel}{color:var(--accent)}${sel} svg{fill:currentColor}`;
      }
      prev = next;
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLButtonElement>(SELECTOR);
      if (!btn) return;
      const key = btn.dataset.prefKey;
      if (!key) return;
      e.stopPropagation();
      toggleFavorite(key);
    };

    document.addEventListener("click", onClick);
    apply();
    const unsub = preferencesStore.subscribe(apply);

    return () => {
      document.removeEventListener("click", onClick);
      unsub();
      styleEl.remove();
    };
  }, []);

  return null;
}
