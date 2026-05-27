# SSR Branch Code Review

Review of the changes on `ssr` since commit `6c3c596` (last static-export
state) — covers committed history through the current working tree:
57 files, ~3,900 LOC across 10 commits plus uncommitted edits.

## Methodology

Followed the `code-review` skill at max effort:

- **Phase 1** — 7 finder agents in parallel (the skill's 5 angles plus two
  domain specialists for SSR/hydration and URL/CDN/security). Each surfaced
  up to 8 candidates, yielding ~50 raw findings.
- **Phase 2** — 9 verifier agents in parallel, each judging a topical group
  of candidates as CONFIRMED / PLAUSIBLE / REFUTED with quoted file:line
  evidence. Result: 26 CONFIRMED, 3 PLAUSIBLE, 4 REFUTED.
- **Phase 3** — fresh sweep reviewer given the verified list, asked for
  defects NOT already flagged. Returned 7 additional candidates.

Recall mode: a single non-REFUTED vote carries the finding.

## Top 15 findings (ranked most-severe first)

### 1. CloudFront strips RSC discriminators → every client navigation falls back to a full MPA reload

**File:** `packages/cdk/lib/pl-conf-experiment-stack.ts:116`

OriginRequestPolicy uses `headerBehavior.none()` and an allowList that omits
Next's `_rsc` param. Both RSC discriminators (the `RSC: 1` header and the
`_rsc` URL param) are stripped at the edge.

**Failure scenario:** User clicks a category chip → `FilterChips` calls
`router.replace('?c=workshop', { scroll: false })` → Next client GETs
`/?c=workshop&_rsc=…` with `RSC: 1` header → CloudFront strips `_rsc` (not
in `filterQueryParams`) and all headers → origin receives a plain GET,
returns `text/html` → `fetch-server-response.js` sees the non-RSC
content-type and calls `doMpaNavigation`, forcing a full-page reload on
every category/tag interaction.

### 2. Container has no SIGTERM graceful-shutdown handler → every ECS deploy drops in-flight responses

**File:** `Dockerfile:46`

`CMD node packages/web/server.js` runs as PID 1 with no wrapper. Next.js
standalone `server.js` does not register a SIGTERM handler that drains
in-flight requests before exit.

**Failure scenario:** On `cdk deploy` or auto scale-in, ECS sends SIGTERM.
Node's default SIGTERM behavior exits immediately, before the ALB's
deregistration delay drains the task. In-flight RSC fetches, .ics
downloads, and streaming HTML responses are truncated; clients see 502s
or partial bodies during every deployment.

### 3. CloudFront `ALLOW_ALL` HTTP methods + no WAF → unbounded POST attack surface

**File:** `packages/cdk/lib/pl-conf-experiment-stack.ts:136`

Default behavior sets `allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL`
and no WAF webACL is attached. POST/PUT/PATCH/DELETE bodies are forwarded
to the Fargate origin with no upper bound.

**Failure scenario:** Attacker sends `POST /` with a multi-GB body.
CloudFront accepts and streams it to the ECS Express service. Next responds
405 only after the body is fully received; meanwhile task memory and
ingress bandwidth are consumed. With `minTaskCount: 1, maxTaskCount: 2`,
a coordinated request pattern pins both tasks. The experiment stack has
no legitimate POST consumer (submission API is a separate Lambda not in
this stack per `EXPERIMENT.md`), so all non-GET methods are pure attack
surface.

### 4. `setPrefs` writes localStorage before hydrate completes → starring before hydration nukes saved prefs

**File:** `packages/web/app/lib/preferences-store.ts:71`

`setPrefs` has no `loaded` guard. The functional updater receives the
module-level `prefs` (still `defaultPreferences` until `hydrateFromStorage`
runs), and the result is unconditionally serialized to localStorage.

**Failure scenario:** Module init sets `prefs = defaultPreferences` and
`loaded = false`. `PreferencesProvider`'s
`useEffect(() => preferencesStore.hydrateFromStorage(), [])` only fires
after first render commit. A `FavoriteButton` clicked in that window calls
`useFavorite.toggle` → `setPrefs((prev) => …)` with
`prev = defaultPreferences`, then
`window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))` runs —
destroying every previously starred event, every hidden flag, and every
display preference.

### 5. `NEXT_PUBLIC_SUBMISSION_API_URL` not propagated at build time → submission form silently 404s

**File:** `Dockerfile:34`

`NEXT_PUBLIC_*` env vars are inlined by Next at build time. The Dockerfile
defines no `ARG` for it, and the experiment stack only sets it as a
container runtime env — too late.

**Failure scenario:** `submit-event-popover.tsx:35-37` reads
`process.env.NEXT_PUBLIC_SUBMISSION_API_URL || '/api/submit'` at build
time. The Dockerfile only ENVs `NODE_ENV`, `PORT`, `HOSTNAME`,
`NEXT_TELEMETRY_DISABLED`. `pl-conf-experiment-stack.ts:74-81` sets
`NEXT_PUBLIC_SUBMISSION_API_URL` as a container runtime env — but
`next build` already ran inside the build stage and inlined the fallback
`/api/submit`. User submits the form → `fetch('/api/submit')` →
CloudFront → ECS → Next 404 → popover shows a generic error.

### 6. `?q=foo` deep links arrive empty: CDN strips `q`, SearchProvider never re-reads URL

**File:** `packages/web/app/components/event-list/search-provider.tsx:40`

CloudFront drops `q` from both cache key and origin allow-list, and
SearchProvider's `useState(defaultValue)` initializes once with the
server-empty value with no `popstate` listener, no `useSearchParams`
resync, and no mount-time `window.location.search` re-read.

**Failure scenario:** `filterQueryParams = ['c','view','tags']` in
`pl-conf-experiment-stack.ts:97` (intentional, to keep cache hit rate up).
User opens `https://site/?q=icfp` → CloudFront forwards request without
`q` → `parseFilterParams` returns `q: ''` → EventListShell passes
`defaultValue=''` → SearchProvider's `useState(defaultValue)` stores ''.
URL bar still shows `?q=icfp`, input is blank, no rows are filtered.

### 7. Race: SearchProvider's `history.replaceState` vs FilterChips/TagsFilter's `router.replace` drops `q` or `tags`

**File:** `packages/web/app/components/event-list/search-provider.tsx:30`

SearchProvider mutates the URL directly via `history.replaceState`; sibling
islands call `router.replace(replaceSearchParam(searchParams, …))` where
`replaceSearchParam` snapshots `searchParams` from the React router state
that may not include the just-typed `q`.

**Failure scenario:** User types `icfp` → SearchProvider debounces 300ms
then `window.history.replaceState(history.state, '', '?q=icfp')`. Before
debounce settles, user clicks a category chip → FilterChips calls
`router.replace(replaceSearchParam(searchParams, 'c', 'workshop'))` where
`replaceSearchParam` does `new URLSearchParams(searchParams.toString())`
from the React snapshot. Result: URL becomes `?c=workshop` with `q`
silently dropped. Symmetric loss for `tags` if the user has typed since the
last router event.

### 8. Hero doesn't roll forward to the next round's deadline when the current one passes

**File:** `packages/web/app/components/event-list/heroes.tsx:101`

`buildHeroEvents` projects each event to ONE deadline (computed against
server `now`); once Round 1's `d.time` elapses mid-session, the Hero
filter `d.time > nowMs` drops the event entirely instead of rolling to
Round 2's still-future deadline that the server never sent.

**Failure scenario:** Multi-round event has Round 1 paper at server-time +
30 min and Round 2 paper next month. `event-list-view.ts:67-88` builds
`HeroEvent.upcomingDeadline = { name, date, time }` — one object, not an
array. User keeps tab open past Round 1's instant; `useNow()` advances;
`d.time > nowMs` is false → event drops out. Round 2's still-future
deadline is never visible.

### 9. Row attributes (`data-has-open-submission`, urgent class, `Round X/Y` badge) frozen at SSR while group headers tick

**File:** `packages/web/app/components/event-row.tsx:62`

EventRow (server component) and EventCard receive `now` from `serverNow` /
`new Date(serverNowMs)`, not from `useNow()`. So lead-deadline selection,
urgent highlight, `data-has-open-submission`, and the round badge bake
once at SSR. Group headers above them tick via `useNow()` in
`group-display.tsx:188`, producing visible inconsistency inside one page.

**Failure scenario:** Cache filled at 14:00 with an event whose only
deadline is 14:30; row HTML gets `data-has-open-submission`. Viewer at
14:45 (within `s-maxage=60` + `stale-while-revalidate=300`) sees the row
under `view=submissions` because VisibilityStyle's CSS keys off the stale
attribute, while the same row's group header (via `useNow()`) renders the
deadline as past.

### 10. Hero ignores `eventPrefs[k].hidden` → hidden events still surface as deadline alerts

**File:** `packages/web/app/components/event-list/heroes.tsx:97`

Hero builds from `buildHeroEvents(activeEvents)` which only filters by
`isActive`. The deleted `useEventListState` first filtered
`events.filter(!hidden)` before passing to Hero.

**Failure scenario:** User stars FOO, later marks FOO as hidden via the
row-action sheet. The row is hidden from the grid by VisibilityStyle's
CSS, but Hero builds `upcomingDeadlines = events.filter(starredKeys.has)`
with no `eventPrefs[k].hidden` check anywhere in `heroes.tsx`. The
deadline hero card "Your next deadline: FOO paper is due in 3 days"
continues to render.

### 11. Footer / chip / tab counts include hidden events → counts diverge from visible rows

**File:** `packages/web/app/lib/event-list-view.ts:113`

`totalActive`, `categoryCounts`, and `tagCounts` are computed server-side
over `activeEvents` / `preTagFiltered` and never subtract
`eventPrefs[k].hidden` (the server has no access to localStorage).
VisibilityStyle only hides rows in CSS — it does not adjust the numeric
counts shown in chips/tabs/footer.

**Failure scenario:** User hides 30 conferences via the action sheet.
Footer still shows "N events tracked" counting all hidden entries;
FilterChips renders `Conferences (50)` while VisibilityStyle's
`[data-event-key]{display:none}` hides 30 of them; TagsFilter shows
`verification (18)` when only ~5 are visible. Clicking a chip with
non-zero count can land on a fully-empty list.

### 12. `CollapsibleGroup count` is pre-view-filter → "5 events" header above 1 visible row

**File:** `packages/web/app/components/event-list/event-list-shell.tsx:99`

`count={g.events.length}` comes from groups built over the non-view-filter
`displayEvents` (see #11 — server can't apply view filter without prefs).

**Failure scenario:** User has exactly one starred event whose next
deadline is May 30, shared with four others; click "Starred" → URL becomes
`?view=starred` → VisibilityStyle CSS hides four non-starred rows →
`DeadlineGroupHeader` still renders "May 30 · 5 events" because `count`
was passed straight from `g.events.length`. One row sits visibly under a
header advertising five.

### 13. `SearchEmptyState` `anyMatch` unfiltered → blank list with no "no results" message

**File:** `packages/web/app/components/event-list/search-empty-state.tsx:16`

`anyMatch` runs over the unfiltered `displayEvents`, so a search that
matches only non-starred events under `view=starred` suppresses the empty
state.

**Failure scenario:** User stars only POPL, navigates to `?view=starred`,
types `icfp`. VisibilityStyle hides every non-POPL row; POPL doesn't
match `icfp`. `anyMatch = events.some((e) => buildSearchHaystack(e).includes(needle))`
is true because unstarred ICFP entries hit the haystack, so
SearchEmptyState returns null. The pre-refactor container's `displayEvents`
was already view-filtered, so it would have rendered "No events match
'icfp'".

### 14. No cross-tab preference sync → silent last-write-wins between tabs

**File:** `packages/web/app/lib/preferences-store.ts:41`

`subscribe` never registers `window.addEventListener('storage', …)`. Tab B
keeps stale in-memory `prefs` until something forces a re-hydrate.

**Failure scenario:** User opens two tabs. In tab A they star ICALP →
`setPrefs` writes `userPrefsV2` to localStorage and notifies only tab A's
listeners. Tab B's StarredCount/VisibilityStyle/Hero stay stale. Then user
toggles anything in tab B; the stale in-memory `prefs` (without A's star)
becomes the JSON payload, overwriting A's star permanently.

### 15. Prepaint script's `JSON.parse` failure disables BOTH starred AND submissions filters

**File:** `packages/web/app/layout.tsx:18`

The script wraps the entire body in one outer try/catch. `JSON.parse(raw)`
runs inside `if (raw) { … }`. When it throws, control jumps to the outer
catch, bypassing both the `else if (view === 'starred')` fallback
(unreachable because `raw` was truthy) and the unconditional
`if (view === 'submissions')` block that follows the parse.

**Failure scenario:** User with corrupt `userPrefsV2 = '{broken'` (browser
extension partial write, storage full, etc.) navigates to `/?view=starred`
or `/?view=submissions`. Line 17 enters the truthy branch, `JSON.parse`
throws, the outer catch swallows it. The user sees every event row paint
for ~50–200 ms until VisibilityStyle hydrates and reasserts the filter —
defeating the prepaint's entire purpose for that user.

## Lower-severity findings (verified but didn't make the top 15)

- **A2** — `:has()` browser-incompat with declared browserslist (Chrome
  100–104, Firefox 100–120, Safari 15.0–15.3 silently drop the rule).
- **A5** — `LayoutSwitcher` flash (list → grid) for grid-pref users on
  every load; prepaint doesn't cover layout.
- **B2** — `dueThisWeek` counted over pre-view-filter list ("X deadlines
  this week" doesn't reflect view).
- **B6** — `tagCounts`/`categoryCounts` don't account for client search;
  chip counts overstate after typing a query.
- **B4** — `displayEvents` order and `groups` array frozen at SSR; stale
  across day changes for long-lived tabs.
- **C4** — Working-tree downgrade of Fargate `cpu` from "1024" to "256"
  with memory unchanged; cold-cache TTFB regresses on the s-maxage=60
  cache-miss path.
- **E2** — SearchProvider has no `popstate` listener; browser back/forward
  across URLs with different `?q=` desyncs the input from the URL.
- **E4** — `useNowTick.tick()` runs synchronously on mount, overwriting
  the server-seeded initial value with the client clock and producing a
  visible countdown flicker right after hydration.
- **E7** — Tag-toggle race between `UrlTagFilterProvider` (in
  `startTransition`) and `TagsFilter` (no transition); rapid double-toggle
  can drop a click.
- **E8** — Collapsed groups flash open on every page entry: initial render
  uses the empty Set; sessionStorage value loads in `useEffect`, triggering
  a `transition-[height]` animation.
- **D6** — `useSessionStorage` calls `setLoaded(true)` even when
  `codec.parse(stored)` throws; corrupt sessionStorage silently resets
  collapsed/dismissed state to defaults.
- **D8** — `preferencesStore.getPrefs` reference-stability invariant is
  undocumented; a future defensive-copy refactor (`return { ...prefs }`)
  would break `useSyncExternalStore` consumers.
- **F2** — `s-maxage=60` + baked `serverNowMs` allows up to ~5 min of
  staleness during the `stale-while-revalidate=300` window.
- **F6** — `tests/global-setup.ts:waitForPort` only checks TCP connect, not
  HTTP readiness; on slow CI the first request can race a half-started
  Next server.
- **F7** — `Intl.DateTimeFormat(undefined, …)` produces locale-dependent
  output; `suppressHydrationWarning` silences the warning but date text
  still flips locale mid-session on the first re-render.
- **G5** — `next.config.ts` `headers()` rule only matches `source: "/"`;
  other routes (`/about/` etc.) ship with no Cache-Control, so CloudFront
  refuses to cache them.
- **G6** — `filter-params.firstValue` silently drops repeated query
  params; round-trip `serialize(parse(input)) === input` fails for
  externally-crafted `?tags=a&tags=b` URLs.
- **G8** — `htmlCachePolicy` uses `headerBehavior.none()` while enabling
  gzip + brotli; the AWS-synthetic normalized encoding dimension covers
  most cases, but downstream caches may mis-deliver if origin's Vary is
  not propagated. PLAUSIBLE, low practical impact.
- **A7/D2/F3** — `preferences-store` holds `prefs` and `loaded` as
  module-level mutable singletons; `getServerSnapshot` returns defaults
  separately, but the invariant ("no server code ever calls `getPrefs` or
  `setPrefs`") is undocumented and the module is imported into many
  server-rendered "use client" files. PLAUSIBLE future risk.
- **S1** — iCal feeds `/ical/*.ics` inherit `defaultTtl=60s` from the
  default CloudFront behavior (the old static deploy set
  `max-age=3600` on each S3 object); subscriber polling now hits origin
  ~60× more often.
- **S3** — ECS Express `healthCheckPath='/'` runs the full SSR home-page
  render for ALB liveness; a brief origin slowdown cycles the task
  instead of letting it recover.
- **S4** — `inject-css-preload.ts` `patchManifest` `console.error`s and
  returns `false` when the `/` header rule is missing; only `chunks.length
=== 0` triggers `process.exit(1)`. A future Next.js upgrade can
  silently disable the preload optimization.
- **S5** — `new Date(serverNowMs)` constructed inside `events.map` in
  `LayoutSwitcher` defeats `memo(EventCardImpl)`; every parent re-render
  re-renders all ~100 cards. Hoist via `useMemo(() => new
Date(serverNowMs), [serverNowMs])` outside the map.
- **S7** — `tests/global-setup.ts:teardown()` sends SIGTERM but doesn't
  await exit or fall back to SIGKILL; a hung server keeps port 3000 bound
  and the next vitest run skips the rebuild + start (treating port 3000
  as "user-started"), silently running against a stale fixture.

## Refuted

- **A6** — `mergeDeep` prototype pollution claim: the spread on
  `preferences-store.ts:17` (`const out = { ...target }`) isolates writes
  to a fresh object; `Object.prototype` is not globally polluted.
- **B8/D7/G2** — `ViewTabs.select` using `window.history.replaceState`:
  Next.js 16.2.4 patches `history.replaceState` to dispatch
  `ACTION_RESTORE`, so `useSearchParams()` does observe the change. No
  sibling-island desync.
- **D4** — Prepaint custom escape vs `CSS.escape` divergence: produces
  different source strings but selector-equivalent matches for the
  abbreviations currently in YAML (`LOPSTR+PPDP`, `QEST+FORMATS`,
  `RuleML+RR` — `+` inside a CSS double-quoted attribute string is
  equivalent to `\+`).
- **F8** — Stale `events.ts` in Docker build: `Dockerfile:29` has an
  explicit `test -f packages/data/generated/events.ts || (echo …; exit 1)`
  guard that fails the build loudly.
