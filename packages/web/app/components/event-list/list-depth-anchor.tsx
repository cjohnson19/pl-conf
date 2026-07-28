"use client";

import { useEffect } from "react";
import { anchorListDepth } from "../../lib/nav-depth";

export function ListDepthAnchor() {
  useEffect(anchorListDepth, []);
  return null;
}
