// Mirrors the prepaint script in app/layout.tsx — works in both SSR and
// browser, unlike CSS.escape which is browser-only. Event keys only contain
// alphanumerics plus a few separators, so escaping \ and " is sufficient.
export function escapeAttr(s: string): string {
  return s.replace(/[\\"]/g, "\\$&");
}

export function eventKeySelector(key: string): string {
  return `[data-event-key="${escapeAttr(key)}"]`;
}

export function starSelector(key: string): string {
  return `[data-pl-star][data-pref-key="${escapeAttr(key)}"]`;
}
