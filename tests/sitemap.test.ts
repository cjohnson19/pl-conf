import { describe, expect, it } from "vitest";
import sitemap from "@/sitemap";

describe("sitemap", () => {
  it("lists every url with a trailing slash so crawlers avoid the 301", () => {
    sitemap().forEach((entry) => {
      expect(new URL(entry.url).pathname).toMatch(/\/$/);
    });
  });
});
