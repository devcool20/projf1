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
Standings driver cutout video on hover — preserve (desktop); mobile may hide inline video to reduce jank.
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
