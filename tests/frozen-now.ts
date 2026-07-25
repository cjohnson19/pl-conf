// The single instant the e2e suite pins. vitest's fake timers, the browser
// clock (page.evaluateOnNewDocument), and the fixture server's SSR clock
// (PL_CONF_NOW_MS) all use it — otherwise the server-computed event list drifts
// away from the frozen browser clock and date-sensitive tests fail with the
// calendar rather than with the code.
//
// Fixture dates in tests/fixtures/events.ts are anchored to this value.
export const FROZEN_NOW_ISO = "2026-06-01T12:00:00.000Z";
export const FROZEN_NOW_MS = Date.parse(FROZEN_NOW_ISO);
