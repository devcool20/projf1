# Overhauling Paddock OS Comms: Development Log
**Date**: April 14, 2026
**Project**: Paddock OS / Comms Interface Refinement

## 1. Design Principles & Aesthetics
*   **Visual Uniformity**: Standardized on circular avatars with 2px dynamic borders. These borders are not just decorative; they serve as "team essence" markers, mapped via the `getTeamColor` utility.
*   **Contextual Hierarchy**: Implemented a "Depth-Aware UI". In nested replies (`depth > 0`), primary avatars and image URL fields are hidden to prioritize the conversation flow and reduce horizontal clutter.
*   **Selection UX**: Shifted from high-contrast border indicators to "Surface Seeding". Selected cards now use a subtle `rgba(30, 64, 175, 0.08)` (subtle navy/blue) background, which feels more premium and less intrusive than a sharp left-border.
*   **Micro-Animations**: Leveraged `framer-motion` for "Life-like" interactions—burst animations on likes (`LikeBurst`) and spring-based modal transitions.

## 2. Problem Solving Approach
### Atomic State Synchronization
*   **The Problem**: Likes were registering multiple times or failing to persist across refreshes.
*   **The Solution**: Abandoned complex RPCs in favor of atomic client-side transactions. We use a combination of:
    1.  Optimistic local state updates for instant feedback.
    2.  Junction table (`comms_thread_likes`) insertions/deletions.
    3.  Count-based updates to the main table for single-source-of-truth.
*   **Result**: 100% reliable counters and icon states.

### Recursive UI Architecture
*   **The Problem**: Nested replies were lacking core features (image uploads, full like-states).
*   **The Solution**: Refactored `ReplyNode` to be a fully independent recursive controller. It now manages its own image upload state, submission lifecycle, and prop-drilling for global state like `userLikedReplies`.

## 3. Tooling & Implementation Workflow
*   **Ripgrep/Select-String Analysis**: Used for deep-scanning `comms-view.tsx` (1400+ lines) to find disconnected logic branches (e.g., missing `deleteReply` implementations).
*   **Multi-Chunk Refactoring**: Used `multi_replace_file_content` to apply cross-component logic shifts (e.g., updating props in the parent and implementations in the child simultaneously) to maintain build integrity.
*   **Real-time Debugging**: Leveraging Supabase realtime subscriptions to ensure the UI reconciles instantly when data is "purged" or "broadcasted" from other sessions.

## 4. Iterative Development Cycle
1.  **Phase 1: Foundation (SQL & Schema)**: Established the `avatar_url` and ownership columns.
2.  **Phase 2: Visual Essence**: Implemented team colors and gradients to differentiate "The Paddock" noise.
3.  **Phase 3: Deep Interaction**: Fixed the like registrations and reply nesting.
4.  **Phase 4: Polish & Purge**: Added owner-specific deletion buttons and standardized the selection aesthetics.

## 5. Decision Log: Why the Blue Selection?
*   **Rationale**: The user requested a "dark blue" selection tint for uniformity. While the primary brand color is purple, a subtle blue background tint (`#1e40af` at 8% opacity) provides a calmer, more "analytical" feel to the selecion state, making it clear which thread is at center-stage without overwhelming the color-palette's team-accents.

---
*This log is maintained for the Karpathy-pattern LLM Wiki.*

---

## 6. Full Session Wiki Log (Start -> Latest)
**Window**: April 14-15, 2026  
**Scope**: Comms system architecture, UI/UX redesign, animation stability, pagination/refresh, profile/video integration, dashboard/next-race visual system, and bookmark feature rollout.

### 6.1 Product Intent (What the user wanted across the session)
The session evolved from a targeted Comms-side-panel feature into a full multi-screen refinement pass. The user repeatedly prioritized:
- premium but readable UI,
- instant, state-synced interactions (likes/replies/bookmarks),
- stable transitions on desktop and mobile (no jitter/flash),
- robust loading behavior (timeouts, no long hangs),
- and practical social features (delete own posts, profile navigation, bookmark saved threads).

The work was not a single "feature branch"-style implementation. It was iterative and corrective: each user QA round exposed edge cases (styling, loading, hydration, state sync, contrast), then the code was adjusted to preserve previous wins while fixing regressions.

---

### 6.2 Phase-by-Phase Development Narrative

#### Phase A - Comms Thread Composer + Side Panel Foundation
**Initial requirement**: right-side create-thread panel for logged-in users, image upload support, and thread detail opening above this panel when a thread is clicked.

**Implementation outcomes**:
- Introduced dedicated create-thread flow in `web/src/components/comms/create-thread-panel.tsx`.
- Refactored `web/src/components/comms/comms-view.tsx` to support panel modes and thread-detail takeover.
- Added profile-awareness in the composer (user context, avatar, identity cues).

**Design decision**:
- Keep "create" and "detail" in one orchestrating container instead of separate routes to reduce navigation overhead and preserve feed context.

---

#### Phase B - Comms Bento Layout + Dynamic Card Geometry
**Requirement expansion**:
- image previews visible in feed cards,
- bento-like organization,
- ratio-aware sizing (1:1, 4:3, etc.),
- owner-only delete controls,
- profile panel on username click (special case for self-profile routing).

**Implementation outcomes**:
- Masonry/bento-like feed behavior in `comms-view.tsx` (grid flow dense + size variations).
- Image preview rendering in card surface (not only detail panel).
- User detail panel introduced via `web/src/components/comms/user-detail-panel.tsx`.
- Ownership-aware controls for delete and profile routing.

**Design decision**:
- Prefer card-level preview and contextual controls over deep-drill-only interaction to reduce clicks and improve scanability.

---

#### Phase C - Likes/Replies Integrity and Data Model Hardening
**Problem reports**:
- multiple likes per account,
- like state not surviving refresh,
- reply counts not accurate,
- reply interactions inconsistent with thread-level interactions.

**Implementation outcomes**:
- Server-side one-like enforcement via RPC + unique constraints.
- Created/used migration logic in `web/supabase_likes_migration.sql`.
- Added optimistic UI + rollback + in-flight lock to prevent rapid duplicate toggles.
- Rebuilt reply counting with recursive aggregation.
- Ensured UI updates sync between list and detail immediately.

**Architecture decision**:
- Use DB constraints as final authority (`UNIQUE(thread_id, profile_id)` style guardrails), not just frontend prevention.
- Keep optimistic updates for responsiveness, but reconcile with backend for correctness.

---

#### Phase D - Upload Reliability + Blob Link Failure Handling
**Reported issues**:
- blob URLs failing after refresh,
- missing like tables causing 404s,
- storage bucket missing errors for `comm_images`.

**Implementation outcomes**:
- Filtered/avoided `blob:` persistence in thread image fields.
- Kept UX stable when backend resources/tables are absent.
- Documented required Supabase setup for storage bucket and policies.

**Operational decision**:
- Make code resilient to partial backend setup while clearly signaling mandatory infra steps.

---

#### Phase E - Driver Video UX Integration (Profile + Thread Detail)
**Requirement**:
- show favorite-driver video in profile and thread detail,
- move timestamp under user identity,
- add tasteful vignette,
- avoid harsh edges,
- improve perceived load (thumbnail-first -> video).

**Implementation outcomes**:
- Video blocks integrated in profile surfaces and thread detail composition.
- Visual treatment tuned repeatedly (vignette strength reduced, edge clipping artifacts addressed).
- Square video format adopted on user request.

**Design decision**:
- Progressive reveal strategy (placeholder/thumbnail -> video) to preserve perceived performance.

---

#### Phase F - Comms UX Regression Plan and Broad App Visual Direction
The user requested a coordinated pass:
- restore Comms to light UI,
- keep motion/behavior improvements,
- eliminate pagination flicker and list jump,
- resolve desktop master-detail snapping,
- eliminate mobile white flash/pop,
- fix long loading hangs in Comms/Predictions.

**Core technical outcomes**:
- Scoped light theme via `.comms-light-theme` in `web/src/app/globals.css`.
- Comms state refactor in `web/src/lib/contexts/comms-context.tsx`:
  - page-based window fetches,
  - explicit `hasMoreThreads`, `isLoadingMoreThreads`, `isRefreshingThreads`,
  - pending-new-comms signal,
  - timeout-wrapped requests.
- Infinite-scroll sentinel stabilization in `comms-view.tsx`.
- Desktop detail panel switched to floating overlay behavior (avoid feed reflow).
- Mobile transitions tuned to avoid shell/content mismatch and white flashes.
- Lightweight suspense fallback in `web/src/app/(paddock)/comms/page.tsx`.

**Architecture decision**:
- Separate initial blocking load from background refresh to stop full remount/flicker loops.

---

#### Phase G - Dashboard + Theme Direction Iterations
The user requested:
- remove dark treatment from landing in one step,
- then re-enable dark hero card later,
- update Next Race to Miami with map and country signal,
- map should be integrated, larger, and readable.

**Implementation outcomes**:
- Dashboard hero and card styling were iteratively rebalanced in `web/src/app/(paddock)/page.tsx`.
- Race calendar expanded to include Miami in `web/src/lib/mock-data.ts`.
- Circuit map integration added with asset mapping (`web/public/maps/*`).
- Country flag support added via static assets:
  - `web/public/flags/us.svg`
  - `web/public/flags/sa.svg`

**Design decision**:
- Prioritize user-perceived clarity over decorative subtlety: map contrast and flag readability were increased when initial "immersed" treatment became too faint.

---

#### Phase H - Bookmark Feature (Comms)
**User requirement**:
- bookmark button in top bar + thread list + thread detail,
- prevent bookmarking own threads,
- live state sync across list/detail/modal,
- persistent per-user storage.

**Implementation outcomes**:
- New DB migration:
  - `web/supabase_bookmarks_migration.sql`
  - table `comms_thread_bookmarks`
  - RLS policies for own-row access
  - toggle RPC `handle_thread_bookmark(...)`
- Context-level bookmark state:
  - `userBookmarkedThreads` in `web/src/lib/contexts/comms-context.tsx`
- Comms UI integration:
  - top-bar "Saved" control,
  - bookmark actions in card row and detail row,
  - in-page bookmarks modal with open-thread action,
  - fetch missing bookmarked threads not present in current pagination window.

**State model decision**:
- Mirror context ids into local view state (same pattern as likes) to keep immediate UI response while retaining shared source-of-truth semantics.

---

#### Phase I - Persistent Desktop Web Text Contrast Bug
Even after theme and class updates, the user repeatedly observed desktop text invisibility while mobile looked acceptable.

**Root cause pattern**:
- effective color override to white on white/near-white surfaces in desktop/responsive context.

**Fix strategy**:
1. Stronger explicit slate text utilities in content lines.
2. Reduce desktop overlay washout when detail panel is open.
3. Add message fallback (`No content provided`) for empty/whitespace content.
4. Hard override with Tailwind important utility where needed (`!text-slate-600`) to prevent theme conflict.

**Files primarily touched**:
- `web/src/components/comms/comms-view.tsx`

**Final styling choice requested by user**:
- softer slate/grey content (`#475569`) rather than harsh black.

---

### 6.3 Key Technical Decisions and Why

#### A) Optimistic UI + Backend Integrity
- Chosen for likes/replies/bookmarks.
- Users get immediate feedback.
- Backend remains authority through constraints/RPC.
- Rollback paths handle transient failures.

#### B) Context + Local Mirror Pattern
- Global context handles fetched canonical state.
- Comms view keeps local mirrored state for immediate interaction.
- This reduced UI latency and prevented broad remount side effects.

#### C) Scoped Theming (`.comms-light-theme`)
- Avoids global regressions when Comms needs different visual treatment than dashboard/predictions.
- Enabled targeted rollback/re-application without reworking entire design token system.

#### D) Overlay Rather Than Layout Push for Detail Panel
- Desktop "master-detail jitter" was caused by feed resize/reflow before panel completion.
- Floating overlay approach avoids card snapping and preserves visual continuity.

#### E) Timeout-Wrapped Data Fetches
- Prevents indefinite loading states from backend stall conditions.
- Gives deterministic behavior and retry affordance.

---

### 6.4 Concrete File Change Index (Major)
- `web/src/components/comms/comms-view.tsx`  
  Core orchestration for list, detail, replies, likes, bookmarks, modal overlays, desktop/mobile transition behavior, and desktop text visibility hardening.

- `web/src/lib/contexts/comms-context.tsx`  
  Pagination architecture, refresh/pending-new state model, auth/profile sync, likes and bookmarks id hydration, realtime hooks.

- `web/src/components/comms/create-thread-panel.tsx`  
  Thread creation UX, image upload flow, profile-integrated composer.

- `web/src/components/comms/user-detail-panel.tsx`  
  In-panel user inspection with visual and lint-safe utility adjustments.

- `web/src/app/(paddock)/comms/page.tsx`  
  Comms page wrapper and lightweight fallback handling.

- `web/src/app/globals.css`  
  Global and scoped theme token behavior, card surfaces, comms-specific light overrides.

- `web/src/app/(paddock)/page.tsx`  
  Dashboard hero and Next Race card behavior, map/flag treatment, race content display tuning.

- `web/src/lib/mock-data.ts`  
  Race data updates (Miami inclusion).

- `web/supabase_likes_migration.sql`  
  Like integrity schema and RPC utilities.

- `web/supabase_bookmarks_migration.sql`  
  Bookmark persistence schema, RLS, and bookmark toggle RPC.

---

### 6.5 What Was Learned / Repeatedly Validated
1. **Desktop vs mobile style parity cannot be assumed**: responsive branches and overlay alpha can create "invisible text" even when class names look correct.
2. **Theming conflicts need explicit guardrails**: `!` utility overrides were needed in this case to prevent silent token/style precedence conflicts.
3. **User feedback loop is essential for UX-level bugs**: many issues (jitter, fade, legibility) are best verified through visual QA snapshots, not only static code inspection.
4. **Backend migrations are product features** in social systems: likes/bookmarks persistence is inseparable from DB schema correctness.

---

### 6.6 Outstanding Operational Note
To fully realize persistent social interactions in all environments, required SQL migrations must be applied in Supabase:
- likes migration (`web/supabase_likes_migration.sql`)
- bookmarks migration (`web/supabase_bookmarks_migration.sql`)

Without this, frontend behavior can appear partially functional but will degrade on refresh or multi-session sync.

---

### 6.7 Final State at End of This Session
- Comms includes create flow, detail flow, reply hierarchy, like integrity, and bookmark system.
- Bookmark interactions are live across list/detail/modal and restricted from self-bookmarking.
- Dashboard Next Race card reflects Miami with larger, high-contrast map and country-flag treatment.
- Desktop text visibility has been repeatedly hardened in Comms with explicit content color strategy and fallback handling.

