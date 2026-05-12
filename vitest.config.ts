import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // E2e tests are the only consumer of @generated, and they run against
      // the fixture-aliased static build. Keep both sides in sync by always
      // resolving @generated to fixtures inside vitest.
      "@generated": path.resolve(import.meta.dirname, "tests/fixtures/events"),
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
