"use client";

import { useEffect } from "react";

export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.plConfHydrated = "1";
  }, []);
  return null;
}
