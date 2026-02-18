import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@generated": path.resolve(import.meta.dirname, "generated/events"),
      "@": path.resolve(import.meta.dirname, "app"),
    },
  },
  test: {
    globalSetup: "tests/global-setup.ts",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
