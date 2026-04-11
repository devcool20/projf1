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
