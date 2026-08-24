import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // E2e tests are the only consumer of @pl-conf/data, and they run
      // against the fixture-aliased static build. Keep both sides in sync by
      // always resolving the data import to fixtures inside vitest.
      "@pl-conf/data": path.resolve(
        import.meta.dirname,
        "tests/fixtures/events.ts"
      ),
      "@": path.resolve(import.meta.dirname, "packages/web/app"),
    },
  },
  test: {
    globalSetup: "tests/global-setup.ts",
    // Lambda tests live next to their handlers so `vi.mock` of the AWS SDK
    // resolves to the same installation the handler imports (pnpm gives each
    // package its own node_modules; a mock registered from tests/ would miss).
    include: ["tests/**/*.test.ts", "packages/functions/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // A test that stubs a global and fails mid-body would otherwise leak it
    // into every later test in the file.
    unstubGlobals: true,
    restoreMocks: true,
  },
});
