"use client";

import { useCounts } from "./counts-context";

export function StarredCount() {
  const { viewCounts } = useCounts();
  if (viewCounts.starred === null) return null;
  return <>{viewCounts.starred}</>;
}
