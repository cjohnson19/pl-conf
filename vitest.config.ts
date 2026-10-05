import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

const E2E = "tests/e2e.test.ts";

export default defineConfig({
  resolve: {
    alias: {
      // Inside vitest the data import always resolves to the fixtures, which
      // is also what the e2e fixture site is built from.
      "@pl-conf/data": path.resolve(
        import.meta.dirname,
        "tests/fixtures/events.ts"
      ),
      "@": path.resolve(import.meta.dirname, "packages/web/app"),
    },
  },
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // A test that stubs a global and fails mid-body would otherwise leak it
    // into every later test in the file.
    unstubGlobals: true,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // Lambda tests live next to their handlers so `vi.mock` of the AWS
          // SDK resolves to the same installation the handler imports (pnpm
          // gives each package its own node_modules; a mock registered from
          // tests/ would miss).
          include: ["tests/**/*.test.ts", "packages/functions/**/*.test.ts"],
          exclude: [...configDefaults.exclude, E2E],
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: [E2E],
          // Builds and serves the fixture site; only runs when e2e specs run.
          globalSetup: "tests/global-setup.ts",
        },
      },
    ],
  },
});
