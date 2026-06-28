import type { MetadataRoute } from "next";
import { events } from "@pl-conf/data";
import { eventPath } from "./lib/event";

const BASE = "https://pl-conferences.com";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const eventPages = Object.values(events).map((e) => ({
    url: `${BASE}${eventPath(e)}`,
    lastModified: new Date(e.lastUpdated),
  }));
  return [
    { url: BASE, lastModified: new Date() },
    { url: `${BASE}/about`, lastModified: new Date() },
    ...eventPages,
  ];
}
