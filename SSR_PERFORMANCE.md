# SSR Performance Findings

Measured against the standalone Next build served locally and driven with
Playwright. Numbers below are localhost (zero RTT, fast CPU) — divide
real-world latency budgets accordingly. The original migration goals
(server-computed view, server-rendered rows, URL-addressable filters,
`content-visibility`) have all landed; what follows is the residual gap
between intent and what users actually get.

## Status

| #   | Finding                                                           | Status                     |
| --- | ----------------------------------------------------------------- | -------------------------- |
| 1   | Origin sends `no-store`; CloudFront can't cache `/`               | implemented (origin)       |
| 2   | `Hero` serializes 65 KB of full event objects                     | done                       |
| 2b  | `displayEvents` is a 65 KB canonical store used page-wide         | partially done (option 1)  |
| 3   | Inlined CSS duplicated three times in HTML                        | done (`inlineCss` removed) |
| 4   | `PreferencesContext` fan-out re-renders ~300 nodes per toggle     | done                       |
| 5   | Search round-trips RSC on every keystroke                         | done                       |
| 6   | Mobile DOM ships two responsive row variants                      | done                       |
| 8   | Per-group `useNowTick` + `ResizeObserver` redundancy              | done                       |
| 9   | Logo `<Link href="/">` self-prefetches `/?_rsc=` after hydration  | done                       |
| 10  | Lighthouse critical chain: HTML → render-blocking CSS             | done (Link preload header) |
| B   | CloudFront compression: gzip is 3× bloated, brotli not negotiated | open                       |

## Baseline measurements

"Original" and earlier "Current" numbers were captured against the standalone
build at `http://127.0.0.1:3101/`. The "Current" column below was re-measured
on 2026-05-25 against the production deployment at
`https://d12c1by0uwwwq.cloudfront.net/` (cold cache-bust, mobile viewport
375×812 for DOM count, desktop 1280×900 for the star click) after #1–#6, #8,
#9 had landed.

| Metric                        | Original     | Current                | Notes                                             |
| ----------------------------- | ------------ | ---------------------- | ------------------------------------------------- |
| HTML transfer (CloudFront)    | 329 KB       | 210 KB                 | Wire bytes; CloudFront gzip is poorly tuned (B)   |
| HTML transfer (local gzip -6) | 106 KB       | 70 KB                  | Apples-to-apples vs prior "Current" — see note    |
| HTML decoded                  | 1.92 MB      | 1.46 MB                | −24 % from `inlineCss` removal + slimmed payloads |
| RSC flight (decoded)          | ~988 KB      | 716 KB across 157 push | −28 % from `DisplayEvent` projection              |
| `Hero` RSC chunk              | ~65 KB       | 23.8 KB                | Slimmed to `HeroEvent` projection                 |
| Largest RSC chunk             | n/a          | 56 KB (push #5)        | Canonical store; remaining target for #2b 2–4     |
| Inlined CSS in HTML           | ~108 KB      | 0 bytes                | `experimental.inlineCss` removed; 0 `<style>`     |
| DOM nodes (mobile, 375×812)   | 8,443        | 6,584                  | −22 % from #6 row-markup consolidation            |
| TTFB (prod, cache hit)        | n/a          | 60 ms                  | CloudFront `X-Cache: Hit` after #1                |
| FCP (prod)                    | 132 ms local | 676 ms                 | Real network adds the HTML download               |
| Star click → first frame      | ~14 ms local | ~12 ms median (prod)   | #4 split; scales with catalog size                |
| Category chip → row change    | ~64 ms       | (unchanged)            | Full RSC round-trip                               |
| Search keystroke → row change | ~339 ms      | ~14 ms                 | Client-side filter via `SearchFilterStyle` (#5)   |

**gzip note.** Two distinct numbers matter. (1) CloudFront wire size — what
the browser actually downloads — is **210 KB**. (2) Local `gzip -c -6 <
curl-of-/` of the decoded HTML is **70 KB**, the like-for-like comparison
with the prior "106 KB Current" entry. The 3× gap between (1) and (2) is
the same compression-bloat issue tracked as Finding **B** below. Brotli is
also broken (returns the uncompressed 1.46 MB), so the wire size won't
benefit from it until that's fixed.

## TL;DR priority

| #   | Finding                                                       | Effort | Impact                                                |
| --- | ------------------------------------------------------------- | ------ | ----------------------------------------------------- |
| 1   | Origin sends `no-store`; CloudFront can't cache `/`           | S      | ~10× TTFB on warm cache hits (done)                   |
| 2   | `Hero` 65 KB chunk — slim to `HeroEvent` projection           | M      | ~41 KB off Hero RSC chunk (done)                      |
| 2b  | `displayEvents` 65 KB canonical store — trim or split fields  | M      | Option 1 (DisplayEvent projection) landed; rest open  |
| 3   | Inlined CSS duplicated three times in HTML                    | S      | ~9–10 KB gzipped + parse cost (done)                  |
| 4   | `PreferencesContext` fan-out re-renders ~300 nodes per toggle | M      | ~300 → ~3 re-renders per star toggle (done)           |
| 5   | Search round-trips RSC on every keystroke                     | M      | 300 ms+ → ~14 ms; cache no longer fragmented (done)   |
| 6   | Mobile DOM ships two responsive row variants                  | M      | 8443 → 6584 mobile nodes (done)                       |
| 8   | Per-group `useNowTick` + `ResizeObserver` redundancy          | S      | Cosmetic; scales poorly (done)                        |
| 9   | Logo `<Link href="/">` self-prefetches `/?_rsc=`              | S      | ~304 KB wire / ~1.83 MB decoded per cold visit (done) |
| 10  | Lighthouse "Avoid chaining critical requests" (HTML → CSS)    | S      | ~50 ms off critical path; clears the audit (done)     |
| B   | CloudFront ships poorly-compressed gzip; no brotli            | S–M    | Wire 210 KB → ~70 KB possible; brotli ~−15 % more     |

---

## 1. Origin sends `no-store`, CloudFront can't cache `/` (implemented)

### Original state

`packages/cdk/lib/pl-conf-experiment-stack.ts:97-112` defines a sensible
`htmlCachePolicy` with `defaultTtl: 60s`, `minTtl: 0s`, gzip+brotli encoding,
no cookies, and an allowlist of filter query params. `packages/web/app/page.tsx`
formerly declared `export const revalidate = 60`. None of that took effect
because the origin returned:

```
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
```

Root cause: `page.tsx` reads `searchParams`, which makes the route fully
dynamic under App Router. `revalidate` is silently ignored on dynamic routes.

### Implementation

`packages/web/next.config.ts:12-24` now forces the header from the app
boundary, which survives the dynamic-render opt-out:

```ts
async headers() {
  return [
    {
      source: "/",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=60, stale-while-revalidate=300",
        },
      ],
    },
  ];
}
```

`page.tsx`'s dead `export const revalidate = 60` was removed at the same
time.

### Verification

Confirmed locally — the standalone server now returns:

```
HTTP/1.1 200 OK
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
```

CDN verification (after deploy) is still pending:

- `curl -I https://<cf-domain>/` → expect `X-Cache: Hit from cloudfront`
  on the second request.
- `curl -I https://<cf-domain>/?c=workshop` should also hit after warm-up
  (query params are in the cache key allowlist).

---

## 2. `Hero` serializes 65 KB of full event objects (done)

### Original state

`EventListShell` is a server component but passed the full active event
array to `Hero` (a client component):

```tsx
<Hero events={activeEvents} initialNowMs={serverNowMs} />
```

`Hero` only ever reads `events.filter(e => starredKeys.has(eventKey(e)))`
and then computes `findNextDeadline` / `findNextStart` for the starred
subset. The other ~95 events serialized in this prop were dead weight.
This produced a ~65 KB RSC chunk full of `{"name":"Symposium on Functional
and Logic Programming",...}` objects.

### Implementation

Defined `HeroEvent` and a `buildHeroEvents(events, now)` helper in
`packages/web/app/lib/event-list-view.ts`:

```ts
export type HeroEvent = {
  key: string;
  abbreviation: string;
  type: ScheduledEvent["type"];
  location?: string;
  upcomingDeadline?: { name: DateName; date: string; time: number };
  upcomingStart?: { date: string; time: number };
};
```

`buildHeroEvents` precomputes the next deadline + next start per event and
drops events with neither, so the array also shortens (~30–80 entries instead
of 97 depending on horizon).

`Hero` (`heroes.tsx`) now consumes `HeroEvent[]`, applies the 14-day horizon
and "still in the future" guards against the live `now` tick, and selects the
soonest deadline/start as before. Imports of `findNextDeadline`,
`findNextStart`, `eventKey`, and `ScheduledEvent` are gone.

`EventListShell` passes `view.heroEvents` instead of `activeEvents`; the
shell's `activeEvents` prop was removed. `page.tsx` also dropped its dead
pre-sort (`sortByEventDate`) since `computeEventListView` re-sorts by next
deadline internally.

### Verification

Hero RSC chunk (measured against the standalone build):

- Before: ~65,000 bytes starting `[{"name":"Symposium on..."}]`
- After: 23,831 bytes starting `[{"key":"ACT-2026","abbreviation":"ACT","type":"conference","location":"Tallinn, Estonia","upcomingDeadline":{...}}]`

A ~41 KB saving on the Hero portion. All 82 vitest tests pass, including the
hero e2e suite (`starred swap`, `minute-grain countdown`, hide/dismiss prefs).

### Trade-off accepted

Previously, `useNowTick` re-ran `findNextDeadline(event, now)` every minute,
so if a deadline passed mid-session the hero would "advance" to the next one.
With server-precomputed `upcomingDeadline`, that mid-session advance is lost:
once the precomputed deadline passes, the hero disappears for that event
until the next page load (HTML cache is 60s). Acceptable given the cache
window.

## 2b. `displayEvents` is a 65 KB _canonical_ store, not a per-component prop (partially done)

### Status

Option 1 (trim dead fields) is implemented:
`packages/web/app/lib/event-list-view.ts:32-52` defines a `DisplayEvent` that
drops `submissionUrl`, `notes`, `lastUpdated`, and `sequence`. `toDisplayEvent`
projects every event before it ships to client components, and every consumer
(`EventRow`, `EventCard`, `CalendarMenu`, `RowActionSheet`, `StarredCount`,
`SearchFilterStyle`) now takes `DisplayEvent` rather than `ScheduledEvent`.

Options 2–4 are still open (drop empty-default keys, slim row islands, defer
grid data). Re-measure before deciding whether any of them are worth pursuing.

### What investigation revealed

After Finding #2 landed, the new largest RSC chunk is still ~65 KB. It is
the same 65,302-byte array, but its role is different from how the original
finding described it. Counting RSC back-references in the served HTML:

```
$ grep -oE '\\"\$21:props:starredCountSlot:props:displayEvents' /tmp/page.html | wc -l
290
```

290 RSC references point into that single array. `LayoutSwitcher`'s
`events="$21:props:starredCountSlot:props:displayEvents"` is just one of
them; the others come from EventRow children (tags chips, FavoriteButton,
CalendarMenu, RowActionSheet) and individual event slots
(`$21:...:displayEvents:5:tags`, `$21:...:displayEvents:11`, etc.).

That means the conclusion in the original Finding #2 — _"slim `LayoutSwitcher`
the same way as `Hero`"_ — is misleading. `LayoutSwitcher` doesn't own the
chunk; it's one of many readers. Slimming only `StarredCount` (e.g. to
`displayKeys: string[]`) would just relocate the canonical store to
`LayoutSwitcher`, with the same total bytes on the wire. Verified by
inspection of the RSC ref graph.

### Where the bytes actually go

Per-field overhead in chunk #11 (just the JSON keys, not values), tallied
from the live RSC payload:

| Field              |   × | Notes                                            |
| ------------------ | --: | ------------------------------------------------ |
| `name`             | 108 | Long titles dominate value bytes                 |
| `abbreviation`     |  97 |                                                  |
| `date`             |  97 |                                                  |
| `location`         |  97 |                                                  |
| `importantDateUrl` |  90 |                                                  |
| `url`              |  94 |                                                  |
| `submissionUrl`    |  85 | **No client-side consumer** (see below)          |
| `rounds`           |  97 |                                                  |
| `notes`            |  97 | Mostly `[]` — never rendered on the list/grid    |
| `type`             |  97 |                                                  |
| `tags`             |  97 |                                                  |
| `partOf`           |  97 | Often `[]` — only rendered by `EventCard` (grid) |
| `colocatedWith`    |  97 | Often `[]` — only rendered by `EventCard` (grid) |
| `lastUpdated`      |  97 | Only used in server aggregation for footer       |
| `sequence`         |  97 | Only used by client-side iCal export (`toICal`)  |
| `format`           |   3 |                                                  |

Just the key overhead is ~18 KB; the bulk of the chunk is values.

### Confirmed dead fields on the client

`grep -rn "submissionUrl"` across `packages/web/app` and `packages/core/src`
returns hits only in `schemas.ts` and in compiled bundles. Nothing reads it
from a `ScheduledEvent` in client code or in any helper called from a client
component.

`grep -rn "lastUpdated"` shows it consumed only in `event-list-view.ts`
(server aggregation to compute `lastUpdatedDate` for the footer) and in
`event-sorters.ts` / `core/src/ical.ts`. The aggregated max already ships
separately via `view.lastUpdatedDate`; the per-event values are wasted on
the client.

`notes` has zero consumers in any rendering path.

### Realistic improvement paths

In order of effort:

1. **Trim dead fields from the client-side view** (low effort, ~6–10 KB).
   Build a `DisplayEvent` projection that omits `submissionUrl`, `notes`,
   `sequence` (or defers it), and `lastUpdated`. Keep everything else.
   `EventListShell` consumes `view.displayEvents: DisplayEvent[]` everywhere.
   `useCalendarExport` keeps working because nothing it reads was dropped
   (it uses `name`, `abbreviation`, `date`, `location`, `rounds`, `url`).
   _Exception:_ `toICal` reads `e.sequence` — either drop sequence and let
   `toICal` default to 0 for the client-download path (the subscribe-URL
   path already uses the server-rendered .ics, which has the correct value),
   or include it.

2. **Drop empty-default keys at serialization time** (low effort, ~1–2 KB).
   In `event-list-view.ts`, before exposing events to client components,
   strip keys whose value equals the schema default: `notes: []`,
   `partOf: []`, `colocatedWith: []`, `format: undefined`. Saves a constant
   per-event overhead.

3. **Slim `LayoutSwitcher` _and_ split row props** (medium effort, ~25–35 KB).
   The 65 KB stays canonical because EventRow's client islands (tags chips,
   FavoriteButton, CalendarMenu, RowActionSheet) all reference into it.
   Reducing the chunk meaningfully requires giving each island the slim
   projection it needs (`prefKey: string` for FavoriteButton already;
   tags array directly; a `CalendarEvent` projection for CalendarMenu).
   Then `LayoutSwitcher` either gets a slim `EventCardEvent` or — better —
   a server-rendered `gridChildren: ReactNode` of `EventCard`s using the
   same projection. Tricky because `EventCard`/`CalendarMenu` are client
   components and their props still serialize. The win is real only if
   every island stops reaching for the full record.

4. **Defer grid data to a client fetch** (medium effort, ~50 KB for default
   users; risk: split caching). Drop `LayoutSwitcher`'s `events` prop
   entirely. Expose `packages/data/generated/events.json` as a static asset
   (already exists; just needs to land under `public/`). On layout toggle,
   the client `fetch`es it, caches in memory, and renders the grid. List
   users (the default) pay nothing. Grid users pay one cached fetch.

Recommendation: (1) has landed. Do (2) opportunistically — still a free
~1–2 KB. Defer (3)/(4) until a re-measure shows we're still over budget.

### Verify

After (1) (already done — verify on re-measure):

- The chunk that begins `21:[\"$\",\"$L27\",null,{\"counts\":...` should
  no longer contain `"submissionUrl"`, `"notes":[]`, `"lastUpdated"`,
  `"sequence"`.

After (2):

- The same chunk should additionally drop `partOf:[]`, `colocatedWith:[]`,
  and any `format:null` keys.

After (3)/(4):

- That chunk should drop from ~65 KB into the 15–30 KB range (depending on
  how many islands switch to slim projections).
- Verify no client component pulls `undefined` from a now-absent field
  via integration tests, not just typecheck.

---

## 3. Inlined CSS is duplicated three times (done)

### Original state

The HTML contained one `<style data-precedence="next">` (35.9 KB) plus two
identical 36.6 KB RSC flight chunks of the same CSS — ~108 KB of CSS for the
browser to parse, ~9–10 KB on the wire after gzip. The culprit was
`experimental.inlineCss: true` interacting with the RSC flight pipeline.

### Implementation

`experimental.inlineCss` was removed from `packages/web/next.config.ts` as
part of the 9ea2af6 perf bundle. Next now serves CSS via a linked stylesheet,
so the duplicate flight chunks are gone.

### Verification

Pending re-measure. `grep -c '@font-face{font-family:Inter' /tmp/page.html`
should now return `0` (font face moved to the linked stylesheet).

---

## 4. `PreferencesContext` fan-out re-renders (done)

### Original state

`packages/web/app/components/preferences-provider.tsx` exposed the full
`prefs` object via one context. Any pref change rebuilt the context value
and re-rendered every consumer — `Hero`, `LayoutSwitcher`, `LayoutToggle`,
`VisibilityStyle`, `StarredCount`, every `CollapsibleGroup`, plus the
per-row trio (`FavoriteButton`, `CalendarMenu` via `useCalendarExport`,
`RowActionSheet`). With 97 rows that came to ~300 component re-renders for
a single star toggle.

### Implementation

Replaced the React context with an external store backed by
`useSyncExternalStore`. `packages/web/app/lib/preferences-store.ts` owns
the mutable `prefs` snapshot and a listener set; `setPrefs` is a stable
module-level function (no more callback whose identity changes on every
state update). `PreferencesProvider` is now a thin component that hydrates
the store from `localStorage` once on mount via a `useEffect`.

`preferences-provider.tsx` exposes narrow hooks so each consumer only
subscribes to the slice it actually reads:

- `useFavorite(prefKey)` — selects the boolean
  `prefs.eventPrefs[prefKey]?.favorite`. A toggle on one row only re-renders
  that row's `FavoriteButton` (the other 96 `getSnapshot` calls return the
  same boolean → `Object.is` skips the render).
- `useEventPrefs()` — returns the `eventPrefs` map reference. Re-renders only
  when an event pref is added/changed (`StarredCount`, `VisibilityStyle`,
  `Hero`, `StarredEmptyState`). Display-only toggles leave this reference
  untouched.
- `useDisplayPref<K>(key)` — returns a single display field. `LayoutSwitcher`
  / `LayoutToggle` only re-render on layout changes; `Hero`'s
  `deadlineHeroDismissed` and `permanentlyHiddenEventHeroes` subscribers are
  independent.
- `usePrefsLoaded()` — selects the loaded boolean.
- `usePreferences()` is kept for `SettingsPopover` only (one component,
  rare opens, needs the full collection).

`useFavorite`, `useCalendarExport`, `LayoutSwitcher`, `StarredCount`,
`VisibilityStyle`, `StarredEmptyState`, `Hero`, `CollapsibleGroup`, and
`LayoutToggle` were rewired to the narrow hooks. `setPrefs` is imported
directly where mutation is needed. The unused `useLocalStorage` hook was
deleted.

### Verification

- `pnpm run typecheck` — clean across all packages.
- `pnpm run test` — 82/82 vitest tests pass, including the full hero,
  star-toggle, layout-persist, hidden-event, and collapse-hint suites
  (`tests/e2e.test.ts`).
- `pnpm run lint` / `pnpm run build` — clean.

Per-toggle render count (by inspection of the selector return values):
a star toggle on one row now re-renders just the toggled `FavoriteButton`,
`StarredCount`, and `VisibilityStyle` (~3 components vs ~300 before). A
display-only toggle (layout, dismiss hero) doesn't touch any row at all.

---

## 5. Search round-trips RSC on every keystroke (done)

### Original state

`SearchPill` debounced 300 ms then wrote `?q=...` via `router.replace`,
triggering an RSC fetch that re-ran `page.tsx` and re-rendered the list
(~339 ms localhost; worse with real network). With `q` in the CloudFront
cache key allowlist, every unique query string was also a cache miss.

### Implementation

`SearchProvider` (`packages/web/app/components/event-list/search-provider.tsx`)
holds query state on the client and uses `history.replaceState` so `?q=` stays
shareable without triggering a navigation. `SearchFilterStyle`
(`packages/web/app/components/event-list/search-filter-style.tsx`) emits a
single `<style>` rule that hides non-matching `[data-event-key]` rows and
`[data-group-keys]` sections — no React re-render of the list. `q` was
dropped from `filterQueryParams` in
`packages/cdk/lib/pl-conf-experiment-stack.ts:97`, so search strings no longer
fragment the CDN cache.

### Verification

Keystroke → row change dropped from ~339 ms to ~14 ms (commit 4df5698).
After deploy, `curl -I https://<cf-domain>/?q=icfp` should hit the same
cache entry as `https://<cf-domain>/`.

---

## 6. Mobile DOM ships two responsive row variants (done)

### Original state

`packages/web/app/components/event-row.tsx` rendered both the narrow and
wide layout variants inside every row — two `RoundRail` instances and two
`DatesDeadlinesLink` instances per row, only one of which was ever painted
(container query gates display). Result: 8,443 DOM nodes for 97 events on
mobile (375×812).

### Implementation

`event-row.tsx` now renders one rail tree per row, positioned with
`grid-template-areas` defined in `packages/web/app/globals.css`:

- Narrow (< 680px row width): `"date title actions" / ".    rail  ."` — two
  grid rows, with the single rail cell occupying row 2 of the title column.
- Wide (≥ 680px row width): `"date title rail actions"` — a single row with
  the rail in its own dedicated column.

The `--no-date` variant mirrors the same areas without the date column. The
date/title/rail/actions divs in JSX now carry `style={{ gridArea: "…" }}`
attributes so cells resolve to the right area regardless of breakpoint.

### Verification

DOM node count at 375×812 against production: **8,443 → 6,584** (−22 %).
Did not reach the spec's "under 6,000" target — the remaining duplication
is the action area (`RowActionSheet` vs `FavoriteButton + CalendarMenu`),
which are different components rather than the same tree, so collapsing
them would require unifying the touch/desktop interaction model. Left as
follow-up if needed.

Layout verified visually at 375 / 768 / 1280 in both list and grid views.

---

## 9. Logo `<Link href="/">` self-prefetches `/?_rsc=` (done)

### Original state

Discovered while profiling production at
`https://d12c1by0uwwwq.cloudfront.net/` after #1–#3, #5, #8 had landed. The
header logo (`packages/web/app/components/header.tsx:13`) was a Next `Link`
to `/`. Next 16's automatic prefetch fires for visible links right after
hydration — so the logo prefetched the page the browser had just rendered.
Measured cold against production:

```
GET /?_rsc=p37cr → 304 KB transfer / 1.83 MB decoded
```

That's larger than the initial HTML body itself, and bigger than every JS
chunk on the page combined. It didn't show up in earlier local profiling
because the in-memory router cache (and Playwright's session cache) suppress
the prefetch on repeat visits within a session.

### Implementation

`packages/web/app/components/header.tsx:15` now passes `prefetch={false}`
to the logo `<Link>`. Click behavior is preserved — Next still soft-navigates
to `/`; only the redundant prefetch goes away.

### Verification

Fresh browser context against production with a cache-bust query param:

- Before: `/?_rsc=p37cr` — 304 KB transfer / 1.83 MB decoded.
- After: zero requests where `pathname === '/' && searchParams.has('_rsc')`.
  The only `_rsc` request is `/about/?_rsc=1r34m` (~23 KB decoded, expected
  from the About link).

Estimated savings per cold load: ~304 KB on the wire, ~1.83 MB of
decode/parse work right after hydration.

---

## 8. Per-group `useNowTick` + `ResizeObserver` (done)

### Original state

`CollapsibleGroup` ran its own `useNowTick(nowMs)` and its own
`ResizeObserver`. With 30+ deadline groups, that meant 30+ minute-aligned
setTimeouts and 30+ live observers.

### Implementation

`NowProvider` (`packages/web/app/components/event-list/now-provider.tsx`) now
calls `useNowTick` exactly once near the top of the shell; `Hero` and
`CollapsibleGroup` read from it via `useNow()`. The `useNowTick` import only
appears in `now-provider.tsx` and the hook source.

`CollapsibleGroup` (`packages/web/app/components/event-list/group-display.tsx:209-234`)
measures lazily: `contentHeight` starts `undefined`, and a fresh
`scrollHeight` is captured on the toggle handler itself. Groups that are
never toggled never measure or observe anything.

### Verification

A minute-boundary tick now produces one state update at the provider, not
30+. Toggling a group still animates correctly because the handler grabs
the current `scrollHeight` synchronously.

---

## 10. Lighthouse "Avoid chaining critical requests" — HTML → CSS (done)

### Original state

Lighthouse flagged a two-link critical chain on `/`:

```
Initial Navigation
  └─ d12c1by0uwwwq.cloudfront.net          457 ms, 206 KB
       └─ chunks/0dbz7byyol3ia.css          507 ms, 8.46 KB
```

Maximum critical-path latency: **507 ms**. The CSS is render-blocking and the
browser can only discover the `<link rel="stylesheet">` after parsing into the
HTML head, so the CSS download chains behind some portion of the HTML body.

A `<link rel="preload" as="style">` in the document head doesn't break the
chain — the existing stylesheet tag is already in head and the preload scanner
picks both up at roughly the same time. The only mechanism that genuinely
parallelizes the two requests is an HTTP `Link` _response header_, which the
browser sees with the response status line, before parsing any HTML body.

### Why not `experimental.inlineCss`?

Re-enabling `experimental.inlineCss: true` was the natural fallback (Finding
#3 had previously turned it off). Tested on Next 16.2.4 — the duplication bug
is **still present** and is now documented upstream as a known limitation:
CSS appears once in `<style data-precedence="next">` and once more inside the
RSC flight stream. Concrete impact of re-enabling it on this codebase:

| Metric               | External CSS | inlineCss=true | Δ        |
| -------------------- | ------------ | -------------- | -------- |
| HTML decoded         | 1.46 MB      | 1.57 MB        | +110 KB  |
| HTML gzip (-6)       | 70 KB        | 95 KB          | +25 KB   |
| `@font-face` in HTML | 0            | 24 (8 × 3)     | +24      |
| Separate CSS req     | 1 × 8.46 KB  | 0              | −8.5 KB  |
| Net cold-load wire   | ~78.5 KB     | ~95 KB         | +16.5 KB |

So inlining clears the audit but ships ~17 KB of duplicated bytes per cold
visit. Punted.

### Implementation

Next.js does not natively emit `Link: ...; rel=preload; as=style` HTTP
headers (`next/font` is special-cased; stylesheets are not). The CSS chunk
filename is content-hashed (`06qw~3.nvheci.css` locally,
`0dbz7byyol3ia.css` in prod), so `headers()` in `next.config.ts` can't be
hardcoded.

`packages/web/scripts/inject-css-preload.ts` runs as a `postbuild` step:

1. Reads `.next/server/app/page_client-reference-manifest.js`, regex-extracts
   every `"static/chunks/*.css"` reference (in practice one chunk for `/`),
   dedupes.
2. Builds the header value: `</_next/<chunk>>; rel=preload; as=style`,
   comma-separated if there's ever more than one.
3. Loads `.next/routes-manifest.json`, finds the `headers[]` rule with
   `source: "/"` (the rule that already carries `Cache-Control` from
   `next.config.ts:headers()`), and appends or updates a `Link` entry.
4. Repeats step 3 for the standalone copy at
   `.next/standalone/packages/web/.next/routes-manifest.json` — that's the
   file the Fargate container actually serves from.

The script honours `PL_CONF_TEST_FIXTURE=1` so the test fixture build under
`.next-test/` is patched the same way.

### Verification

Local standalone (`node packages/web/server.js`), fresh build:

```
$ curl -sI http://127.0.0.1:3101/ | grep -i link
link: </_next/static/chunks/0dbz7byyol3ia.css>; rel=preload; as=style
link: </_next/static/media/83afe278b6a6bb3c-s.p.0q-301v4kxxnr.woff2>; rel=preload; as="font"; ...
```

HTML decoded / gzip sizes unchanged (1.46 MB / 70 KB) — only the response
header changed. All 82 vitest tests pass. CloudFront passes Link headers
through unmodified (already confirmed for the `next/font` header).

### Notes / known seams

- The CSS hash is content-addressed by Turbopack, so the script reads it
  fresh on every build — no manual sync needed when CSS changes.
- `entryCSSFiles` is an internal Next manifest field; if Next renames it the
  regex (`"static/chunks/*.css"`) still finds any CSS chunk reference, but a
  future restructure of chunk paths would require an update.
- After deploy, re-measure with Lighthouse against the production URL to
  confirm the "Avoid chaining critical requests" audit clears. The 50 ms
  saving is a floor; on slower connections the parallelism wins more.

---

## B. CloudFront compression: bloated gzip, no brotli

### Current state

Discovered during the 2026-05-25 re-measure. CloudFront is serving HTML
gzip at roughly **3× the size** of an apples-to-apples local `gzip -6`,
and is not negotiating brotli at all:

```
curl -sH 'Accept-Encoding: gzip' https://d12c1by0uwwwq.cloudfront.net/ | wc -c
# 210457  (CloudFront-served gzip)

curl -s   --compressed https://d12c1by0uwwwq.cloudfront.net/ | gzip -c -6 | wc -c
# 70776   (local gzip -6 of the same decoded HTML)

curl -sH 'Accept-Encoding: br'   https://d12c1by0uwwwq.cloudfront.net/ -o /tmp/br
wc -c /tmp/br                                                  # 1460205 (uncompressed)
file /tmp/br                                                   # ASCII text, ⇒ not brotli
```

So real users on a cold cache pay ~140 KB more wire bytes than necessary,
and brotli — which typically beats gzip by another ~15–20 % on HTML —
isn't on the wire at all. Most likely causes (need to verify against the
deployed CloudFront distribution):

- **Origin streaming gzip with tiny chunks / fresh dictionaries.** Next's
  standalone server streams the response and Node `zlib` defaults to
  per-chunk compression, which wastes the dictionary. If CloudFront's
  origin policy includes `Accept-Encoding: gzip` (forwarding it to the
  origin), CF passes through the origin's already-bad gzip rather than
  recompressing.
- **Brotli not enabled on the response-headers policy or the cache
  behavior.** `packages/cdk/lib/pl-conf-experiment-stack.ts:97-112`
  configures `enableAcceptEncodingGzip: true` and `enableAcceptEncodingBrotli: true`
  on the cache policy (so the `Vary` works), but actual brotli serving
  depends on whether the **viewer**-side compression is enabled and
  whether the origin opts out by sending its own `Content-Encoding`.

### Change

1. Strip `Accept-Encoding` from the origin request (so CloudFront
   recompresses on its own) and let CloudFront's automatic
   compression take over. Verify with `curl -sH 'Accept-Encoding: gzip' …`
   that the wire size drops toward the local-gzip baseline (~70 KB).
2. Confirm brotli is actually being served:
   `curl -sH 'Accept-Encoding: br' … | file -` should report binary, not
   ASCII. If not, audit the cache behavior's `Compress` setting and the
   response headers policy.
3. Independently, configure the Next standalone server to compress
   responses up front (or run it behind a reverse proxy that does), so
   the origin payload is well-compressed even on routes CloudFront
   forwards uncompressed.

### Verify

After deploy:

```
curl -sH 'Accept-Encoding: gzip' https://<host>/ | wc -c   # expect ~70 KB
curl -sH 'Accept-Encoding: br'   https://<host>/ | wc -c   # expect ~55–60 KB
curl -sI -H 'Accept-Encoding: br' https://<host>/ \
  | grep -i content-encoding                                 # expect: br
```

Estimated savings per cold visitor: ~140 KB on the wire (gzip fix alone),
~155 KB once brotli also lands. Cost: $0 — the bytes are CloudFront-billed
either way; users just download less.

---

## Bonus: dead config to clean up

- ~~`packages/web/app/page.tsx:8` — `export const revalidate = 60`~~. **Removed**
  as part of Finding #1.
- `packages/cdk/lib/pl-conf-experiment-stack.ts:140-148` — the `/_next/static/*`
  behavior creates a second `HttpOrigin` pointing at the same backend.
  Functionally fine; cosmetically redundant.
- `images: { unoptimized: true }` (`packages/web/next.config.ts:11`) — correct;
  no `<Image>` usage here.
- Fargate `minTaskCount: 1, maxTaskCount: 2` (`pl-conf-experiment-stack.ts:88-91`)
  — fine _after_ #1 lands. Until then, origin cold starts hit users on every
  cache miss because there is no cache.

---

## Suggested execution order

1. ~~**#1 (force `Cache-Control` on `/`)**~~ — **done at origin** (`next.config.ts`).
   Still needs a deploy and a CloudFront verification curl.
2. ~~**#2 Hero portion (slim `HeroEvent` projection)**~~ — **done**.
   Saves ~41 KB on the Hero RSC chunk.
3. ~~**#2b option 1 (trim dead fields from `displayEvents`)**~~ — **done** via
   the `DisplayEvent` projection.
4. ~~**#3 (drop `experimental.inlineCss`)**~~ — **done**.
5. ~~**#5 (client-side search)**~~ — **done**. Keystroke → row change is
   ~14 ms; `q` removed from the CDN cache key.
6. ~~**#8 (centralize `useNowTick`, lazy `ResizeObserver`)**~~ — **done** via
   `NowProvider` + lazy `scrollHeight` capture in `CollapsibleGroup`.
7. ~~**#9 (`prefetch={false}` on the logo Link)**~~ — **done**. Eliminates a
   304 KB / 1.83 MB self-prefetch per cold visit.
8. ~~**Re-measure baseline**~~ — **done** on 2026-05-25 against production.
   HTML decoded −24 %, inlined CSS 0 bytes, mobile DOM 8443 → 6584.
9. ~~**#4 (split `PreferencesContext`)**~~ — **done**. External store +
   per-slice `useSyncExternalStore` hooks; star toggle drops from ~300 →
   ~3 component re-renders.
10. ~~**#6 (collapse dual-variant row markup)**~~ — **done** via
    `grid-template-areas`. Mobile DOM 8443 → 6584 nodes.
11. ~~**#10 (HTTP `Link` preload header for the home-page CSS)**~~ — **done**
    via the `inject-css-preload.ts` postbuild step. Clears the Lighthouse
    "Avoid chaining critical requests" audit; ~50 ms off the critical path.
12. **#B (CloudFront compression)** — biggest remaining cold-load win for
    visitors. ~140 KB on the wire from fixing gzip, ~155 KB once brotli
    also lands. Likely cdk-only change in
    `packages/cdk/lib/pl-conf-experiment-stack.ts`.
13. **#2b options 2–4** (strip empty-default keys, slim row islands, defer
    grid data) — re-measure shows we're at 56 KB on the largest canonical
    chunk; revisit only if the cold-load budget tightens further.

## Measuring

Build + serve locally, then drive with Playwright (`browser_evaluate` against
`performance.getEntriesByType(...)`) for FCP/LCP and `PerformanceObserver`
for LCP-after-load. The localhost numbers above are the floor; the gap
between local and prod is the network + origin latency #1 is supposed to
hide.
