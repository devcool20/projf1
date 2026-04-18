# projf1 Web - Architecture and Design Reference

This file is the canonical context brief for engineers and LLM agents working in the `web` app.

## 1) Product Snapshot

- App identity: **projf1 / Paddock OS**, a Formula 1 themed community + data experience.
- UX model: dashboard-style operating console (not document-style scrolling).
- Primary domains:
  - Comms threads and nested replies
  - Predictions and leaderboard-style engagement
  - Driver + constructor standings from an external PDA service
  - User profile/auth ("Super License")
  - Event screenings and gear/loadout experiences

## 2) Tech Stack and Runtime

- Framework: `next@16` with App Router.
- UI: `react@19`, `framer-motion`, `@heroicons/react` (outline/solid; [Heroicons](https://heroicons.com/) set).
- Charts package present: `recharts` (currently not heavily used in visible codepaths).
- Data backend: `@supabase/supabase-js`.
- Styling: Tailwind v4 via `@import "tailwindcss"` and CSS theme tokens in `src/app/globals.css`.
- Type safety: TypeScript strict mode.

## 3) High-Level Architecture

### 3.1 Layered structure

- **Route layer (`src/app`)**
  - App shell and route composition.
  - Server entry for standings page prefetch (`(paddock)/standings/page.tsx`).
  - API routes for PDA proxy + avatar streaming.
- **View/components layer (`src/components`)**
  - Screen components and shell primitives.
  - Feature folders: `comms`, `predictions`, `standings`, `profile`, `shop`, `shell`.
- **Domain/data layer (`src/lib`)**
  - Shared types (`types.ts`).
  - Static seed/mock datasets (`mock-data.ts`).
  - Supabase client (`supabase.ts`).
  - PDA fetchers (`api.ts`, `pda-standings-server.ts`).
  - Engagement scoring (`signal-score.ts`), team color/flag mapping (`team-colors.ts`).
- **Hooks layer**
  - `use-streaming-number` for simulated live telemetry fluctuations.

### 3.2 Rendering model

- Root shell and most feature screens are client components.
- Standings route uses a **hybrid model**:
  - Server page preloads standings from PDA (`fetch*Server` with `revalidate: 15`).
  - Client `StandingsScreen` hydrates and can refresh via local API routes.

## 4) Navigation and Route Map

- Main shell route group: `src/app/(paddock)`.
- Primary routes:
  - `/` Dashboard
  - `/comms`
  - `/predictions`
  - `/paddock-premieres`
  - `/standings`
  - `/pit-wall`
  - `/parc-ferme`
  - `/profile`
- Legacy/placeholder redirects:
  - `/strategy` -> `/paddock-premieres`
  - `/telemetry` -> `/predictions`

## 5) Core Data Flows

### 5.1 Supabase-backed flows

- Supabase is initialized once from public env vars in `src/lib/supabase.ts`.
- Feature modules using live Supabase:
  - **Comms** (`components/comms/comms-view.tsx`)
    - Reads threads + replies + profile join.
    - Real-time subscriptions to `comms_threads` and `profiles`.
    - Supports:
      - create thread
      - nested replies
      - like/unlike thread and reply
      - delete own thread
      - optimistic UI updates with reconciliation fetch.
  - **Predictions** (`components/predictions/predictions-screen.tsx`)
    - Reads active `prediction_config`.
    - Reads predictions for active event.
    - Real-time subscription to `race_predictions`.
    - Creates new prediction entries (locked 1h before qualifying).
    - Likes increment through RPC.
  - **Profile** (`components/profile/profile-screen.tsx`)
    - Auth sign-up/sign-in/sign-out via Supabase Auth.
    - Reads + updates profile fields (`fav_team`, `fav_driver`).
    - Reads user-created comms + predictions history.
  - **User detail side panel** (`comms/user-detail-panel.tsx`)
    - Reads another user's profile and latest transmissions.

### 5.2 PDA (external standings) flows

- External service base URL:
  - `NEXT_PUBLIC_PDA_URL` or fallback `https://projf1-w7s7.onrender.com`.
- Server fetch path (`lib/pda-standings-server.ts`):
  - Used for initial standings render on server.
  - Uses `next: { revalidate: 15 }`.
- Client refresh path (`lib/api.ts`):
  - Calls local Next API routes:
    - `/api/pda/standings/drivers`
    - `/api/pda/standings/teams`
  - Uses `revalidate: 0`.
- API routes (`src/app/api/pda/standings/*/route.ts`):
  - Proxy PDA API, return JSON passthrough.
  - `cache: "no-store"` in route handler fetch.

### 5.3 Local/static simulation flows

- Dashboard, pit-wall mock telemetry, screenings, products, nav items, etc. are driven by `src/lib/mock-data.ts`.
- `use-streaming-number` simulates live values for telemetry-style UI affordances.

## 6) API Surface in this app

### 6.1 `GET /api/pda/standings/drivers?season=YYYY`

- Proxies PDA driver standings endpoint.
- Returns `StandingsApiResponse<ApiDriverStanding>` on success.
- Returns `{ success: false, error }` with upstream status on failure.

### 6.2 `GET /api/pda/standings/teams?season=YYYY`

- Same behavior for constructor standings.

### 6.3 `GET /api/avatar/[firstName]`

- Streams local mp4 avatar files with range support.
- File lookup: `<repo>/avatar/<sanitizedFirstName>.mp4`.
- Handles full content and partial content (206) for video playback robustness.
- Returns 404 if file absent.

## 7) Environment and Configuration

### 7.1 Required env vars

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional: `NEXT_PUBLIC_PDA_URL`

### 7.2 Next config

- Remote image hosts allowed:
  - `lh3.googleusercontent.com`
  - `images.unsplash.com`

### 7.3 TypeScript path alias

- `@/*` -> `src/*`

## 8) Design System and Principles

The current UI language is "mission control, motorsport telemetry, premium dark console."

### 8.1 Visual principles

- Dark-first, low-glare surfaces.
- Neon accent hierarchy:
  - Primary orange for action.
  - Cyan for live/active/system signal.
  - Red for alerts/race critical.
- Dense but readable information architecture with dashboard cards.
- Monospace for machine/system data; headline font for identity and hierarchy.

### 8.2 Motion principles

- Page transitions are subtle (fade + vertical drift).
- Data feels live through small recurrent number changes and ticker movement.
- Interactions use soft scale and border-emphasis rather than heavy transforms.
- Motion supports "control room" feedback, not playful novelty.

### 8.3 Interaction principles

- Keep high-frequency actions obvious (`TRANSMIT`, `Deploy Prediction`, `Refresh`).
- Preserve contextual side panels for drill-down instead of hard route changes.
- Surface status labels in microcopy (LOCKED/ACTIVE, LIVE/STANDBY).

### 8.4 Token baseline (from `globals.css`)

- Base: `#0e0e10`
- Panel: `#121215`
- Primary: `#ff9b48`
- Secondary: `#7ef6ee`
- Tertiary: `#ff725d`
- Error: `#ff7351` / alert semantics via red accents

## 9) Important Behavioral Notes and Constraints

- Comms likes/replies use optimistic updates and then reconcile from backend; if adding new mutations, keep this pattern to avoid jitter.
- Reply trees are recursive and depth-sensitive; avoid flattening without preserving parent-child semantics.
- Predictions "lock window" is strictly time-based (`<= 1h before qualifying`).
- Standings should degrade gracefully when PDA is unavailable (already handled by fallback error UI).
- Avatar route depends on an `avatar` directory that may not be committed in all environments; treat this as optional local media dependency.

## 10) Known Gaps / Risks

- Some components still use `any` for Supabase payloads (profile/comms/predictions areas).
- Media assets referenced in code (`/f1logo.mp4`, `/f1car.mp4`, `/api/avatar/*`) are not guaranteed present in repository snapshots.
- Redirected routes (`/strategy`, `/telemetry`) suggest feature consolidation or temporary routing.
- Public Supabase keys are client-exposed by design, but database security relies on RLS/RPC policy correctness (outside this repo).

## 11) Suggested Change Strategy (for future architecture/design updates)

- For **design changes**:
  - Update token values and shared utility classes first (`globals.css`) before touching feature components.
  - Keep shell components (`pit-wall-dock`, `hud-top-bar`, `paddock-shell`) as the single source of layout truth.
- For **data architecture changes**:
  - Add/adjust types in `src/lib/types.ts` first.
  - Update API adapters in `src/lib` next.
  - Then update feature components with explicit loading/error states.
- For **performance/scale work**:
  - Start with Comms and Predictions (highest mutation + realtime complexity).
  - Consider central query/cache layer if repeated Supabase fetch logic grows.

## 12) Developer Commands

- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Start production: `npm run start`


