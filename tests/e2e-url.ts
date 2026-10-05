// Where the e2e suite points its browser. The default is the fixture server
// that tests/global-setup.ts spawns; set E2E_BASE_URL to test a server you
// started yourself (global-setup then skips the build and spawn).
export const E2E_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
