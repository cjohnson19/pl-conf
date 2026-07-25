// SSR-time clock. `/` is rendered on demand, so the list it computes depends on
// when the request lands. The e2e suite freezes the browser clock; setting
// PL_CONF_NOW_MS pins the server to the same instant so the server-computed
// ordering, filtering, and counts agree with what the page renders.
export function serverNow(): Date {
  const raw = process.env.PL_CONF_NOW_MS?.trim();
  if (!raw) return new Date();
  const pinned = Number(raw);
  // Fail loudly rather than falling back to the wall clock: a silent fallback
  // puts the e2e suite back to failing with the calendar instead of the code,
  // and passing an ISO string is the obvious mistake given the constant it
  // comes from is named FROZEN_NOW_ISO.
  if (!Number.isFinite(pinned)) {
    throw new Error(
      `PL_CONF_NOW_MS must be epoch milliseconds, got ${JSON.stringify(raw)}`
    );
  }
  return new Date(pinned);
}
