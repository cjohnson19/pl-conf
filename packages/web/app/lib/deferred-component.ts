import { type ComponentType, useState } from "react";

// Guarantees the preload still runs in a tab that never goes idle — a
// background tab defers idle callbacks until it is foregrounded.
const IDLE_TIMEOUT_MS = 2000;

export type DeferredComponent<P> = {
  /**
   * The component, once its chunk is in memory. Mounting from here keeps an
   * interaction out of Suspense: committing a fallback arms React's ~300ms
   * reveal throttle, which the interaction then waits out even though the
   * chunk already resolved.
   */
  loaded: () => ComponentType<P> | undefined;
  load: () => Promise<ComponentType<P> | undefined>;
  /**
   * `when` is evaluated at idle, once layout has settled, so a caller can skip
   * a chunk this page turns out not to need. It runs once — pair it with a
   * warm-up on the trigger for layouts that can change after load.
   */
  preloadWhenIdle: (when?: () => boolean) => void;
};

/**
 * Predicate for `preloadWhenIdle`: is any element matching `selector` actually
 * on screen? Rows stay mounted under `display: none` when filtered or hidden,
 * so this checks every match rather than just the first.
 */
export function anyVisible(selector: string): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).some(
    (el) => el.offsetParent !== null
  );
}

/**
 * Mounts a deferred component on demand: `open` swaps it in (immediately when
 * the chunk is already resolved, keeping the interaction out of Suspense) and
 * `warm` starts the fetch on the events that precede activation.
 */
export function useDeferred<P>(d: DeferredComponent<P>): {
  Component: ComponentType<P> | undefined;
  open: () => void;
  warm: () => void;
} {
  const [Component, setComponent] = useState<ComponentType<P> | undefined>(
    undefined
  );
  const open = () => {
    const ready = d.loaded();
    if (ready) setComponent(() => ready);
    else
      void d.load().then((c) => {
        if (c) setComponent(() => c);
      });
  };
  return { Component, open, warm: () => void d.load() };
}

export function deferredComponent<P>(
  importer: () => Promise<ComponentType<P>>
): DeferredComponent<P> {
  let component: ComponentType<P> | undefined;
  let pending: Promise<ComponentType<P> | undefined> | undefined;

  const failed = (err: unknown) => {
    // Drop the memoized promise. Caching the failure would hand every later
    // attempt the same result, leaving the trigger inert for the rest of the
    // session over one flaky chunk fetch.
    pending = undefined;
    console.error("Deferred component failed to load", err);
    return undefined;
  };

  const load = () => {
    pending ??= importer().then((c) => {
      if (!c) return failed(new Error("importer resolved no component"));
      component = c;
      return c;
    }, failed);
    return pending;
  };

  return {
    loaded: () => component,
    load,
    preloadWhenIdle: (when) => {
      if (typeof window === "undefined") return;
      const run = () => {
        if (!when || when()) void load();
      };
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
        return;
      }
      // Safari before 17.4 has no requestIdleCallback. Approximate it by
      // waiting for load, so the fetch lands after first paint without
      // stalling for the full idle timeout.
      const soonAfterLoad = () => setTimeout(run, 200);
      if (document.readyState === "complete") soonAfterLoad();
      else window.addEventListener("load", soonAfterLoad, { once: true });
    },
  };
}
