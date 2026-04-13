Architecture (from web/CLAUDE.md — still the spine)
Stack: Next 16 App Router, React 19, Tailwind v4 (globals.css tokens), Framer Motion, Lucide, Supabase client, PDA standings via /api/pda/standings/* + optional NEXT_PUBLIC_PDA_URL.
Layout: (paddock) route group; mostly client screens; standings hybrid: server prefetch (pda-standings-server, revalidate 15) + client refresh.
Data: Comms / predictions / profile = Supabase + realtime channels; dashboard/mock = mock-data.ts; avatars = /api/avatar/[firstName] (local mp4, optional).
Design doc in CLAUDE.md still describes original dark “mission control” tokens; the live UI has diverged toward light-first + bottom shell (see below).
Product / UX direction (this chat)
Original ask: “Vibrant Velocity” overhaul — glass, motion, India-leaning energy; do not remove standings hover driver video.
Pivot: User hated dark/broken chrome → mobile-first premium light; Apple-like bottom nav (small, sliding active pill); remove Pit Wall route + nav; remove global search; hide scrollbars (global + utilities).
Typography: Premium Sleek — Sora headings, Inter body, JetBrains Mono data (layout.tsx + globals.css weight/spacing).
Colors: Light palette in CSS vars (--color-base ~ #f8f9fb, panel white, outlines slate-ish); kept violet/cyan-style accents for primary UI; team accents via --team-accent + team-colors / applyTeamAccent.
Shell & navigation (implemented)
paddock-shell: Removed HudTopBar + PitWallDock; full-width main; bottom padding for dock; ambient blobs retuned for light.
PaddockBottomNav: Fixed position: fixed (was broken / mid-screen); grid-cols-7, small labels, layoutId spring pill; no Search; Pit Wall removed from navItems in mock-data.ts.
pit-wall/page.tsx: Deleted.
Telemetry: Ticker moved dashboard-only (page.tsx), not global chrome.
Per-screen / feature work (granular)
Dashboard ((paddock)/page.tsx): Light cards, stagger motion; root motion.div later set initial={false} to avoid double entry animation with PageTransition.
Comms:
URL ?t=<threadId> sync (comms/page.tsx + comms-view.tsx): open/close pushes/replaces query.
Mobile: thread detail = full overlay; list hidden when detail open; desktop keeps side-by-side.
Grey blank screen bug: overlay/list visibility gated on selectedThreadId, not panel mode alone.
Thread panel motion: slide from right in/out (spring on x).
Create thread: removed inline end panel; FAB bottom-right → overlay with full CreateThreadPanel; success closes + refetches.
Thread detail: removed DriverVideo; header right = blank pill (no fav driver text). Message = “Transmission” card; image = stronger frame + subtle gradient footer label.
Misc: LikeBurst, transmit pulse, toast sound, typing cleanups over time.
Predictions: Draggable chips + drop zones; locked holographic styling; RawPredictionRow.profiles union (object vs array) + pickProfile — fixes Vercel TS build.
Profile: prediction_config normalized object vs array (RawProfilePrediction + pickPredictionConfig) — fixes build on prediction_config?.event_name.
Standings: Light glass list; hover row + podium chibi videos preserved on desktop; mobile list layout reworked (POS / DRIVER / PTS compact; team+flag subline on small screens); top-3 name contrast fixed (text-slate-900 / 700 on light cards).
Detail UX change: side DriverDetailPanel removed from main layout; tap driver (podium + list) or team card → modal overlay with richer blocks (gap to leader, rivals; team share %, driver roster). Constructors cards motion.button + onOpenTeam.
Performance: lib/api.ts — 15s in-memory cache + in-flight dedupe for PDA client fetches (reduces repeat refresh lag).
Premieres: Map section moved bottom; light map styling; pb-20 for nav clearance.
Parc Ferme: Page entry motion; product cards 3D tilt.
Global motion / refresh jank: page-transition.tsx — removed x/scale corner drift; short fade + tiny y; several screens’ root wrappers use initial={false} so they don’t stack with global transition.
Lint / build hygiene (historical): Date.now() in render fixes; hooks purity; duplicate LikeBurst removed; standings server Promise.allSettled; removed unused imports; button classes text-white on primary CTAs where needed.
Local build note: occasional Windows .next ENOTEMPTY on next build — env/cache, not type logic.
Files to remember (high signal)
Theme / chrome: src/app/globals.css, src/app/layout.tsx, src/components/shell/paddock-shell.tsx, paddock-bottom-nav.tsx, mock-data.ts (nav).
Comms: comms-view.tsx, comms/page.tsx, create-thread-panel.tsx, transmit-input.tsx, related panels.
Standings: standings-screen.tsx, standings-list.tsx, podium.tsx, constructors-view.tsx.
Predictions / profile builds: predictions-screen.tsx, profile-screen.tsx.
Motion: components/motion/page-transition.tsx.
PDA client perf: lib/api.ts.
Constraints you should keep enforcing
Standings: **no** hover/podium preview video — chibi clip **only in driver detail modal** (see Chat #3); list + podium stay static on hover.
web/CLAUDE.md is canonical for architecture but design tokens section is outdated vs current light UI — treat CLAUDE as structure + data flows, not current color truth.
Do not recreate Pit Wall / global search unless explicitly requested.

## Chat #2

**Docs**: Re-stated roles — `CLAUDE.md` = architecture / data flows only; `AGENTS.md` = agent-session changelog (this file). Design tokens in CLAUDE can lag the live light UI.

**Profile off bottom nav, on dashboard**: Dropped Profile from `mock-data.ts` `navItems`; `paddock-bottom-nav.tsx` `grid-cols-7` → `6`. Dashboard `(paddock)/page.tsx`: row = `TelemetryTicker` (flex-1) + `PremiumProfileTrigger`; `DashboardProfileModal` opens `ProfileScreen` almost full-screen, iOS-style spring (scale + y), dim backdrop, header “Super License” + X, body scroll lock + Escape. **Portal to `document.body`** — `PageTransition` uses transforms, so `fixed` inside main would mis-position.

**Profile trigger polish (v2)**: Removed stacked gradient ring + heavy purple shadow (read “cheap”). Single `rounded-full` white pill, `border-slate-200`, neutral `shadow-[0_1px_2px…]`, `UserRound` `strokeWidth={2.25}`, hover border/bg shift + `text-primary`, `focus-visible` ring, gentler `whileHover` / `whileTap`.

**`lib/utils.ts`**: Shared `cn()`; `moving-border.tsx` switched off local `cn` duplicate.

**Moving border (hero “projf1” bar)**: `components/ui/moving-border.tsx` — Aceternity-style animated edge via `useAnimationFrame` + SVG `<rect>` path + radial-gradient orb (`p-[2px]` track); inner radius `calc(radius * 0.96)`. Dashboard hero: `MovingBorderButton` `as="div"`, `borderRadius="1.5rem"`, `duration={4800}`, inner keeps `dashboard-panel` + blobs + copy. Springs tuned for large perimeter.

**Floating dock (bottom nav)**: Replaced grid+pill nav with `components/ui/floating-dock.tsx` — shared `mouseX` from **`e.clientX`** (viewport-consistent with `getBoundingClientRect`), `useSpring` on tray + icon sizes, distance bands ±120px, tooltips spring in/out (blur→sharp), `aria-current` on active link. **Containment pass**: dock `w-fit` + `max-w-[calc(100vw-1.25rem)]` so pill hugs icons; nav wrapper `flex justify-center` + inner `w-fit max-w-full`; tighter `px`/`gap`/`rounded`, `h-[4rem]`, **`overflow-visible`** so tooltips not clipped (dropped `overflow-x-auto` on bar).

**Predictions system (GP-centric + profile)**: `lib/f1-calendar-2026.ts` — 2026 rounds 1–14 public UTC anchors (`fp1Iso` / `qualifyingIso` / `raceIso`), `matchTokens` for fuzzy match to `prediction_config.event_name`, `isRoundInPredictionHorizon(..., 30)` (FP1 within 30d horizon + race window not over ~race+4h), `getQualifyingLockTimeMs` prefers DB `qualifying_at` else calendar quali, `formatGpRange`, `matchConfigToRound`. **`predictions-screen.tsx` rewrite**: no right sidebar; grid of upcoming GPs (Open/Locked, Linked vs no DB link); tap card → detail + `race_predictions` for that `event_id`; likes + realtime channel; **`selectedEventIdRef`** so `postgres_changes` handler isn’t stale. **`prediction-creator-modal.tsx`**: same portal/modal shell as profile; full drag chips / podium / pole / DOTD; auth via `getUser()` + copy if no `prediction_config` match; lock still **≤1h before qualifying**. **FAB `+`**: `fixed` `bottom-[calc(5.25rem+safe-area)]` `right-4` `z-[95]` above dock; modal target = selected GP else first linked horizon round else first horizon round. **Typography**: fewer all-caps mono walls — `font-headline` for titles, body `text-sm`/`text-slate-600`, `font-mono` + `tabular-nums` mainly countdowns. **`mock-data.ts`**: `predictionDriverPool` expanded (more 2026-style names). **`supabase/seed_prediction_config_f1_2026.sql`**: idempotent `INSERT … SELECT … WHERE NOT EXISTS` for 14 `prediction_config` rows (`event_name`, `qualifying_at`, `lat`, `is_active`) aligned to calendar; comments for extra required columns (`id`, `created_at`).

**Constraints unchanged**: Standings hover driver video; no Pit Wall / global search unless asked; CLAUDE for structure not live color truth.

**Page transition (perf)**: `page-transition.tsx` — `AnimatePresence` **`mode="sync"`** (not `wait`, which queued exit+enter and felt very laggy), **`initial={false}`** so hard refresh doesn’t run a fade-in on first paint; route change = **opacity-only** tween **~130ms** with ease `[0.22,1,0.36,1]` (no `y` during route swap). `paddock-shell` ambient blurs toned down slightly; main scroll gets **`translateZ(0)`** compositor hint.

**Chat #2 (continued — ink + type + moving border shuffle)**: Global fonts **`layout.tsx`**: **Syne** (headings) + **Manrope** (body), keep **JetBrains Mono** for telemetry only. **`globals.css`**: body `font-weight: 400`, `.font-headline` default **600**, `h1` **700**; new **`.surface-ink`** / **`.surface-ink-muted`** matte charcoal panels; **`.gp-meta-row`** for GP country/date caps line. **Dashboard**: removed `MovingBorderButton` from mission-control hero → **`surface-ink`** matte panel, white/zinc copy, subtle violet/white glows; **moving border** moved to **Top Thread** + **Next Screening** cards (`MovingBorderButton` inside `Link`). **Race Weekend Live** card unchanged (gradient). **Predictions**: “Grand Prix picks” header uses **`surface-ink`** + white type + relative layout; countdown chip **`bg-white/[0.06]`** when a GP selected. **GP cards**: stripped flags/Open-Locked badges/“Linked…” footer; title-only top, **10px** circuit line, **`gp-meta-row`** country + date row, chevron-only footer; **FAB** shrunk to **44px** (`h-11 w-11`, smaller `Plus`). Dashboard **Top Prediction** + **NextRaceCard** label weights aligned (less mono wall).

**Premium motion refactor (global + key lists)**: Added shared motion presets in `components/motion/premium-motion.ts` (`iosSpring` = `stiffness:300`, `damping:30`; `routeVariants`; `listContainerVariants` with `staggerChildren:0.05`; `listItemVariants`; `skeletonPulse`). `page-transition.tsx` now uses `AnimatePresence mode="wait"` + slide/scale route variants (enter from `y:20`, leave with subtle scale-down/fade). **Comms / Standings / Predictions** now use staggered list entrances with spring transitions. **Skeleton-to-content crossfade** implemented for Comms, Standings, Predictions using `AnimatePresence mode="wait"` + keyed `motion` containers + `layout` (reduced pop-in on hydration). `standings-list.tsx` row motions moved to shared spring/stagger. `floating-dock.tsx` adds `layoutId="floating-dock-active-bg"` for shared active-state movement.

**Dashboard + Profile system pass**: Removed dashboard **Next Screening** tile; moved **Top Prediction** into that slot and removed old lower duplicate. Top Prediction card now uses moving-border light and deep-links to `/predictions?event=<event_id>&prediction=<id>`. Dashboard now computes **Top 5 rotating threads** + **Top 5 rotating predictions** from Supabase (`comms_threads`, `race_predictions`) with in-house recency+engagement scoring; auto-rotates (thread ~4.8s, prediction ~5.2s), falls back to mock data if backend unavailable. Top Thread click opens exact thread via `/comms?t=<threadId>`. Predictions screen reads event/prediction query params and preselects/highlights target prediction. Profile screen: removed `DriverVideo`, added avatar box + upload action (Supabase Storage bucket `profile-avatars` + `profiles.avatar_url` update), and tightened responsive layout in header/actions/forms for modal/mobile widths.

## Chat #3 (session changelog — UI, motion, modals, hydration)

**Standings — driver detail & list (UX + data)**  
- Removed **podium hover chibi video** (`podium.tsx`); hover video removed from list earlier (`standings-list.tsx`). **Driver video** only in **driver detail modal** (`standings-screen.tsx`), with **metadata-driven box** sizing from `videoWidth`/`videoHeight` (`onLoadedMetadata` / `onLoadedData`) so letterboxing is minimized; narrow header column + `object-contain`.  
- Modal: **`createPortal(..., document.body)`**, transparent outer scrim, **`document.body` scroll lock** while open; **`premium-scrollbar`** on modal body.  
- **Minimal copy** on podium (no country + driver code line); list columns trimmed (no NAT column; no inline driver code on rows). Header subtitle dropped “total points scored” line.  
- **Hydration fix**: `fetchedAt` clock used bare `toLocaleTimeString()` → SSR **12h** vs client **24h** mismatch. Replaced with **`formatFetchedClock(iso)`** — `toLocaleTimeString("en-GB", { hour12: false, hour/minute/second: "2-digit" })` in `standings-screen.tsx`.

**Comms — thread detail, long text, FAB + create modal**  
- **Thread detail aside** (mobile overlay): **`bg-slate-900/20` + blur removed** → `bg-transparent`; bottom padding accounts for dock + safe area.  
- **`ExpandableText`**: clamp + measure overflow; **“Show more” / “Show less”** on **thread cards** (default 3 lines) and **thread detail** “Transmission” (default 5 lines); `stopPropagation` on toggle so row open isn’t triggered.  
- **Create thread + FAB**: Both **`createPortal` to `document.body`** (avoids `fixed` inside Framer **`transform`** ancestors → FAB/modal no longer scroll with content). Overlay **`bg-transparent`**; **`body` overflow hidden** while create modal open. FAB **`z-200`**, overlay **`z-199`**, aligned with dock safe-area bottom inset.  
- Thread detail scroll container: **`premium-scrollbar`**, height tuned for dock.

**Predictions**  
- **FAB** also **`createPortal` to `document.body`** + **`z-200`** (same fixed-position issue as Comms).

**Modals (global theme)**  
- **`prediction-creator-modal.tsx`** and **`dashboard-profile-modal.tsx`**: full-screen dismiss layer **`bg-transparent`** (was `bg-slate-900/45` + blur) for flat white theme consistency.

**Global layout / theme — flat white**  
- **`globals.css`**: `--color-base`, `--color-surface`, `--color-surface-dim`, **`body` background** → **`#ffffff`** (was ~`#f8f9fb`); panel hover token slightly adjusted.  
- **`paddock-shell.tsx`**: root **`bg-white`**; **removed** ambient **blur blob** layer (no grey/lavender wash behind cards).  
- **`paddock-shell` main**: **`premium-scrollbar`** (replaces hidden `thin-scrollbar` on shell), **`pb-36`** so last scroll row clears floating dock.

**Scrollbars (`globals.css`)**  
- **`.premium-scrollbar`**: slim **~6px** thumb, **slate** tint, rounded pill, hover darkens; **`@media (max-width: 767px)`** → scrollbar hidden (width 0 / `scrollbar-width: none`).  
- **`.thin-scrollbar`** redefined to match premium behavior (legacy class name still works). **`html`** scrollbar styled the same; mobile hides.

**Motion — second pass (reduce route / list jank)**  
- **`premium-motion.ts`**: unified **fast opacity-first** system — `fastFade` (~150ms), **`routeVariants`** opacity-only; **`listContainerVariants`** empty (no stagger delay); **`listItemVariants`** opacity-only; **`modalSpring`** / **`overlayVariants`** / **`modalPanelVariants`** for modals; **`iosSpring`** slightly snappier for taps.  
- **`page-transition.tsx`**: **`mode="popLayout"`** + **`routeVariants`** + **`fastFade`** (avoids `mode="wait"` + slide/scale stacking with screen-level loaders).  
- **Comms / Standings / Predictions**: loading ↔ loaded **`mode="popLayout"`** where applicable; thread detail / profile / create overlays use **opacity** + shared modal variants; removed **layout** + heavy **whileHover scale** on thread cards where it hurt.  
- **`podium.tsx`**: **flex `flex-1 min-w-0`** cards (no fixed `31vw` clipping); responsive type; lighter motion.  
- **`standings-list.tsx`**: **`premium-scrollbar`**, **`pb-4`** in list scroller.  
- **`(paddock)/page.tsx`**: dashboard grid stagger simplified (opacity-first grid items); hero fade shortened.

**Floating dock**  
- Ongoing tweaks: **`floating-dock.tsx`** bar height / **`items-center`** / symmetric **`px`/`py`**; **`paddock-bottom-nav.tsx`** horizontal padding + safe-area bottom.

**Docs / constraints reminder**  
- **`web/AGENTS.md`** (this file) = **live UI + agent changelog**; **`web/CLAUDE.md`** = architecture / data flows (design tokens there may lag).  
- **Standings hover video**: removed per user; video lives in **modal only** (current truth — overrides older “preserve hover video” note in §Constraints).

## Chat #4 — Comms screen testing system

**Goal**: Automated tests for Comms-related logic — **robustness** (edge cases, unicode, dedupe) and **traffic** (volume, burst likes, large lists).

**Tooling**: Jest via `next/jest` — `jest.config.js` (`setupFilesAfterEnv` → `jest.setup.ts` with DOM mocks), **`package.json`** scripts: `test`, `test:watch`, `test:coverage`.

**`src/lib/comms-test-utils.ts`**: Pure helpers for reply trees (`countReplies`, `updateReplyLikeTree`, `addReplyToTree`, find/remove/flatten/depth), list helpers (`sortThreadsByEngagement`, `sortThreadsByRecency`, `filterThreadsByQuery`), traffic generators (`generateTrafficThreads`, `generateStressTestThreads`), race helper (`simulateRaceCondition`), small harness (`runRobustnessTests`). **Signal scoring** in helpers re-exports **`computeSignalScore` / `getSignalLabel`** from **`signal-score.ts`** (same as production Comms). **`generateNestedReplies`** fixed so nested replies attach under **`parent.replies`**, not a flat root array.

**Tests** (`src/components/comms/__tests__/`): **`comms-tree.test.ts`** (deep chains, immutability-style updates); **`comms-signal.test.ts`** (production signal + sort/filter); **`comms-robustness.test.ts`** (search edge cases, race id dedupe); **`comms-traffic.test.ts`** (generated load, 5k-thread perf smoke, 10k-op burst). Run: **`npm test`** from `web/`.
