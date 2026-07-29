"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type ViewNavContextValue = {
  pending: boolean;
  navigateView: (url: string) => void;
};

const ViewNavContext = createContext<ViewNavContextValue | null>(null);

// Owns the router transition behind view-tab switches that need a server
// render (entering or leaving the archive). ViewTabs starts the navigation;
// ListSkeletonBoundary reads `pending` to swap the stale list for a skeleton
// while the flight response is in transit. A root loading.tsx can't do this:
// only the search params change, so Next reuses the page's loading boundary
// (layout-router keys it without search params) and never shows the fallback.
export function ViewNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigateView = useCallback(
    (url: string) => {
      // Scrolls to the top, unlike the chips: this swaps the list for a
      // different set of events, so holding the old offset would drop the
      // reader into the middle of it with no heading in sight. Jump now
      // rather than at commit so the skeleton is seen from its top.
      window.scrollTo({ top: 0 });
      startTransition(() => router.replace(url));
    },
    [router]
  );
  const value = useMemo(
    () => ({ pending, navigateView }),
    [pending, navigateView]
  );
  return (
    <ViewNavContext.Provider value={value}>{children}</ViewNavContext.Provider>
  );
}

export function useViewNav(): ViewNavContextValue {
  const ctx = useContext(ViewNavContext);
  if (ctx === null) {
    throw new Error("useViewNav must be used inside a <ViewNavProvider>");
  }
  return ctx;
}
