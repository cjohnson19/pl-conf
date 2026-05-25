# SSR Performance Findings

Measured against the standalone Next build served locally and driven with
Playwright. Numbers below are localhost (zero RTT, fast CPU) — divide
real-world latency budgets accordingly. The original migration goals
(server-computed view, server-rendered rows, URL-addressable filters,
`content-visibility`) have all landed; what follows is the residual gap
between intent and what users actually get.

## Status

| #   | Finding                                                       | Status               |
| --- | ------------------------------------------------------------- | -------------------- |
| 1   | Origin sends `no-store`; CloudFront can't cache `/`           | implemented (origin) |
| 2   | `Hero` serializes 65 KB of full event objects                 | done                 |
| 2b  | `displayEvents` is a 65 KB canonical store used page-wide     | open (revised scope) |
| 3   | Inlined CSS duplicated three times in HTML                    | open                 |
| 4   | `PreferencesContext` fan-out re-renders ~300 nodes per toggle | open                 |
| 5   | Search round-trips RSC on every keystroke                     | open                 |
| 6   | Mobile DOM ships two responsive row variants                  | open                 |
| 7   | `Hero` pops in after hydration (CLS)                          | open                 |
| 8   | Per-group `useNowTick` + `ResizeObserver` redundancy          | open                 |

## Baseline measurements

Measured against the standalone build at `http://127.0.0.1:3101/` with 97
active events. The "current" column reflects the state after Finding #1 (origin
header) and Finding #2 (Hero slim) landed.

| Metric                        | Original     | Current     | Notes                                             |
| ----------------------------- | ------------ | ----------- | ------------------------------------------------- |
| HTML transfer (gzip)          | 329 KB       | 106 KB      | Mostly RSC flight payload — see "gzip note" below |
| HTML decoded                  | 1.92 MB      | 1.94 MB     | Half of that is `<script>` tags (RSC chunks)      |
| RSC flight (decoded)          | ~988 KB      | ~1.00 MB    | Largest single chunk: 65 KB — now `displayEvents` |
| `Hero` RSC chunk              | ~65 KB       | ~24 KB      | Slimmed to `HeroEvent` projection                 |
| Inlined CSS in HTML           | ~108 KB      | ~108 KB     | 35.9 KB `<style>` + 2× 36.6 KB duplicates         |
| DOM nodes (mobile, 375×812)   | 8,443        | (unchanged) | 97 events × ~87 nodes/event                       |
| FCP / LCP (localhost)         | 132 / 172 ms | (unchanged) | Real network adds the full HTML download          |
| Star click → first frame      | ~14 ms       | (unchanged) | Locally fine; fan-out cost scales with row count  |
| Category chip → row change    | ~64 ms       | (unchanged) | Full RSC round-trip                               |
| Search keystroke → row change | ~339 ms      | (unchanged) | 300 ms debounce + RSC fetch + render              |

**gzip note.** The original 329 KB figure was measured before the SSR
client-island refactor and likely captured the full-RSC `?_rsc` payload, not
the rendered HTML. The current 106 KB number is `gzip -c < curl-of-/`. The
decoded HTML size (1.94 MB) is the like-for-like comparison and is essentially
unchanged from the original 1.92 MB — the wins so far are in the RSC chunk
distribution, not total bytes. Treat the gzip-original column with suspicion
until someone reproduces it.

## TL;DR priority

| #   | Finding                                                       | Effort | Impact                                         |
| --- | ------------------------------------------------------------- | ------ | ---------------------------------------------- |
| 1   | Origin sends `no-store`; CloudFront can't cache `/`           | S      | ~10× TTFB on warm cache hits                   |
| 2   | `Hero` 65 KB chunk — slim to `HeroEvent` projection           | M      | ~41 KB off Hero RSC chunk (done)               |
| 2b  | `displayEvents` 65 KB canonical store — trim or split fields  | M      | ~6–15 KB realistic; bigger needs refactor      |
| 3   | Inlined CSS duplicated three times in HTML                    | S      | ~9–10 KB gzipped + parse cost                  |
| 4   | `PreferencesContext` fan-out re-renders ~300 nodes per toggle | M      | INP risk that scales with catalog size         |
| 5   | Search round-trips RSC on every keystroke                     | M      | 300 ms+ latency, high-cardinality cache misses |
| 6   | Mobile DOM ships two responsive row variants                  | M      | Memory + parse cost on low-end devices         |
| 7   | `Hero` pops in after hydration (CLS)                          | S      | Layout shift on slow clients                   |
| 8   | Per-group `useNowTick` + `ResizeObserver` redundancy          | S      | Cosmetic; scales poorly                        |

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

## 2b. `displayEvents` is a 65 KB _canonical_ store, not a per-component prop

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

Recommendation: do (1)+(2) opportunistically alongside the other findings —
quick wins with no architectural cost. Defer (3)/(4) until the field-level
audit shows we're still over budget.

### Verify

After (1)+(2):

- `curl -s http://<host>/ | wc -c` should drop by ~8–12 KB decoded.
- The chunk that begins `21:[\"$\",\"$L27\",null,{\"counts\":...` should
  no longer contain `"submissionUrl"`, `"notes":[]`, `"lastUpdated"`,
  `"sequence"`.

After (3)/(4):

- That chunk should drop from ~65 KB into the 15–30 KB range (depending on
  how many islands switch to slim projections).
- Verify no client component pulls `undefined` from a now-absent field
  via integration tests, not just typecheck.

---

## 3. Inlined CSS is duplicated three times

### Current state

The HTML contains:

1. One `<style data-precedence="next">` tag — 35.9 KB.
2. Two identical RSC flight chunks of 36.6 KB each containing the same CSS.

Gzip dedupes most of it (the on-the-wire cost is ~9–10 KB extra), but the
browser still parses ~108 KB of CSS to hydrate the document. Almost
certainly an artifact of `experimental.inlineCss: true`
(`packages/web/next.config.ts:13`) interacting with the RSC flight pipeline.

### Change

Test with `experimental.inlineCss: false` and measure FCP. If FCP regression
is tolerable, drop the option — the duplicated flight chunks should go away.
If FCP regresses meaningfully, file an upstream issue and keep the
duplication for now.

### Verify

`grep -c '@font-face{font-family:Inter' /tmp/page.html` — currently `2`;
expect `1` after the change.

---

## 4. `PreferencesContext` fan-out re-renders

### Current state

`packages/web/app/components/preferences-provider.tsx` exposes the full
`prefs` object via one context. Any pref change rebuilds the context value
and re-renders every consumer.

Current consumers:

- `Hero`, `LayoutSwitcher`, `LayoutToggle`, `VisibilityStyle`, `StarredCount`,
  `CollapsibleGroup`
- Per row: `FavoriteButton`, `CalendarMenu` (via `useCalendarExport`),
  `RowActionSheet` — that's three subscribers × 97 rows = ~291 hooks

A single star toggle currently re-renders ~300 components. Locally it
measures at ~14 ms to first frame, which is fine — but the cost scales with
`displayEvents.length`, and the per-component work isn't free on mid-tier
mobile.

### Change

Split the context. Two cheap options:

1. **Setter/reader split.** One context for `prefs` (changes often), another
   for `setPrefs` (stable reference). Components that only need to _write_
   (like `LayoutToggle` and the dismiss/hide menu items) subscribe to only
   the setter and never re-render on data changes.

2. **Per-key selector.** Reach for `use-context-selector` or a small Zustand
   store. `useFavorite(prefKey)` only reads `prefs.eventPrefs[prefKey]?.favorite`
   — let it subscribe to just that slice.

Option 2 is the better fix; Option 1 is the cheap one. They compose.

### Verify

Add a `console.count("FavoriteButton render")` and toggle one star. Today
it logs 97 (or however many rows are rendered). After the change it should
log 1.

---

## 5. Search round-trips RSC on every keystroke

### Current state

`SearchPill` (`packages/web/app/components/event-list/filters.tsx:46-105`)
debounces 300 ms, then writes `?q=...` to the URL via `router.replace`.
That triggers an RSC fetch, which re-runs `page.tsx` server-side and
re-renders the full event list.

On localhost: ~339 ms keystroke → row change. On a real connection,
add origin RTT + TTFB. With `q` in the CloudFront cache key allowlist
(`pl-conf-experiment-stack.ts:95`), every unique query string is a cache
miss — exactly the high-cardinality problem your own #6 in the original
doc flagged as a risk.

### Change

Keep category/tag/view in the URL (low cardinality, cache-friendly), but
filter `q` client-side. `buildSearchHaystacks`
(`packages/web/app/lib/event-list-view.ts:29-41`) already builds the right
index — just call it on the client when `q` is set. The displayed rows
fall back to a client-only filter pass over the server-rendered list.

Drop `q` from `filterQueryParams` in `pl-conf-experiment-stack.ts:95` so
search no longer fragments the cache.

### Verify

- Typing into the search box should update the visible rows within ~50 ms,
  not 300+ ms.
- `curl -I https://<cf-domain>/?q=icfp` should still hit the same cache
  entry as `https://<cf-domain>/` (no `Vary` on `q`).

---

## 6. Mobile DOM ships two responsive row variants

### Current state

`packages/web/app/components/event-row.tsx:112-135` renders both the narrow
and wide layout variants inside every row:

```tsx
<div className="block pt-1 @[680px]/row:hidden">
  <RoundRail ... />
</div>

<div className="hidden min-w-0 flex-col gap-1 text-[13px] @[680px]/row:flex">
  ...
  <RoundRail ... />
</div>
```

That's two `RoundRail` instances per row, only one of which is ever painted
(container query gates display). Result: 8,443 DOM nodes for 97 events on
mobile. `content-visibility: auto` bounds layout/paint cost, but parse and
memory cost stays high.

### Change

Decide on one canonical structure that uses CSS to _rearrange_ on wide
viewports rather than rendering two trees. A grid with `grid-template-areas`
that swaps on `@container row (min-width: 680px)` can move the rail block
from below the title to a separate column without duplicating the markup.

### Verify

`document.querySelectorAll("*").length` on a mobile viewport should drop
roughly proportionally to the duplication removed. Target: under 6,000.

---

## 7. `Hero` pops in after hydration

### Current state

`packages/web/app/components/event-list/heroes.tsx:119` returns `null` until
`prefsLoaded` is true. After hydration, `HeroSlot` (`heroes.tsx:197-242`)
animates height from 0 → measured height via a `ResizeObserver`. Users with
starred events see the Hero appear and shove the rest of the page down
several hundred milliseconds after FCP. CLS risk.

The prepaint script in `packages/web/app/layout.tsx:9-41` solves the
star/hide visibility flicker but not the Hero slot.

### Change

Reserve the Hero slot on the server with a fixed minimum height or a
skeleton card. Either:

1. Always render a placeholder of the same height as a typical Hero card.
   Replace its content client-side once `prefsLoaded`. Avoids CLS at the
   cost of an empty band for users with no starred events (acceptable).
2. Extend the prepaint script to check `starredKeys.size > 0` and emit a
   `<div data-hero-pending style="height: 140px">` if so, then `Hero`
   replaces it on hydration.

Option 1 is simpler.

### Verify

CLS measured via `web-vitals` or Chrome DevTools should drop to ~0 for the
above-the-fold region. Reload with a starred event and watch — the list
shouldn't shift.

---

## 8. Per-group `useNowTick` + `ResizeObserver`

### Current state

`CollapsibleGroup` (`packages/web/app/components/event-list/group-display.tsx:186-226`)
runs its own `useNowTick(nowMs)` and its own `ResizeObserver`. With 30+
deadline groups, that's 30+ minute-aligned setTimeouts and 30+ observers.

### Change

Hoist `useNowTick` once into a `NowProvider` context near the top of the
shell. Every consumer reads from it. (Today the only `now` consumers
that genuinely tick are the Hero countdown and the group-header countdown —
all rows render with `serverNowMs` and rely on `suppressHydrationWarning`,
so they don't need a tick at all.)

For the resize observer: most groups never collapse and their height is
known at render time. Measure lazily — only when the user actually toggles.

### Verify

`performance.getEntriesByType("longtask")` after a minute-boundary should
show no spike. The current implementation fires 30+ state updates on every
minute change.

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
3. **#2b (trim dead fields from `displayEvents`)** — easy ~6–10 KB. Drop
   `submissionUrl`, `notes`, `lastUpdated`, `sequence` from the projection
   that ships to client components. See #2b for the audit.
4. **#4 (split `PreferencesContext`)** — INP insurance. Worth doing before
   the catalog grows further.
5. **#5 (client-side search)** — removes the laggiest interaction and
   stops fragmenting the CDN cache.
6. **#7 (reserve Hero slot)** — quick CLS fix once #1 is verified.
7. **#3, #6, #8** — opportunistic cleanup.
8. **#2b deep refactor** (slim row islands or defer grid data) — only if
   field trimming doesn't get us into budget.

## Measuring

Build + serve locally, then drive with Playwright (`browser_evaluate` against
`performance.getEntriesByType(...)`) for FCP/LCP and `PerformanceObserver`
for LCP-after-load. The localhost numbers above are the floor; the gap
between local and prod is the network + origin latency #1 is supposed to
hide.
