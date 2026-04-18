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

---

## 7. Parc Ferme Session Wiki Log (Start -> Latest)
**Date**: April 17, 2026  
**Scope**: Parc Fermé rail performance, asset cache invalidation, card/dock visual system, single-screen layout stability, full-bleed rendering, and final card image fill + right-edge whitespace fix.

### 7.1 User Intent and Product Direction
This session was a focused UX/performance pass on the Parc Fermé experience. The user repeatedly emphasized:
- cinematic card browsing that feels smooth on mobile and desktop,
- immediate visual parity after replacing card PNG assets,
- dark, premium fullscreen presentation with no white flashes or gutters,
- dock and rails that visually belong to the same scene,
- and collectible cards whose images fill the shape cleanly.

The delivery pattern was iterative QA: each visual/runtime issue was fixed, validated, and then refined after user screenshot feedback.

---

### 7.2 Phase-by-Phase Technical Narrative

#### Phase A - Asset Refresh Correctness (No stale card images)
**Issue reported**: Replaced `/public/cards/*.png` files were not reflected immediately.

**Implementation**:
- Added `withCardAssetVersion()` in `web/src/lib/parc-card-assets.ts`.
- Wired `imageSrc` generation in `web/src/app/(paddock)/parc-ferme/page.tsx` through that helper.
- Set `unoptimized` conditionally for local `/cards/` images in:
  - `web/src/components/parc-ferme/collectible-card.tsx`
  - `web/src/components/parc-ferme/card-detail-view.tsx`
- Set `images.minimumCacheTTL: 0` in `web/next.config.ts`.

**Design/architecture decision**:
- **Versioned URL cache busting** was chosen over ad-hoc manual renaming because it centralizes cache invalidation and keeps card file names stable.
- **Local-card `unoptimized`** was used for deterministic development behavior and to avoid waiting on image optimization cache churn during fast iteration.

**Tradeoff**:
- Disabling optimization for local card assets can increase raw payload vs optimized pipeline, but guaranteed freshness was prioritized for this design-heavy flow.

---

#### Phase B - Mobile Drag Performance (rail jank elimination)
**Issue reported**: Dragging the rail on mobile felt jittery and heavy.

**Implementation** in `web/src/components/parc-ferme/card-rail.tsx`:
- Introduced `requestAnimationFrame` batching for drag index updates:
  - `dragRafRef` and `pendingIndexRef`
  - `scheduleIndexFromDrag(next)` to collapse multiple pointer moves into one frame commit
- Added `cancelDragRaf()` on pointer end/cancel.
- Snapping now resolves from `pendingIndexRef` to avoid stale frame state.
- Tuned non-drag tween timing/easing for tighter settle behavior.

**Architecture decision**:
- Use **frame-synced state updates** for high-frequency pointer interaction to align React state commits with the browser render loop.

**Why**:
- Pointer move events can fire much faster than render cadence; direct `setState` on each event causes avoidable reconciliation pressure and inconsistent frame pacing.

**Tradeoff**:
- Slightly more complex pointer lifecycle bookkeeping, but significant interaction smoothness and battery/runtime efficiency improvement on mobile.

---

#### Phase C - Single-screen Scenic Composition + Dock Harmony
**Issue cluster**:
- layout overflow/stacking behavior caused unstable viewport fit,
- dock visual treatment did not fully match the dark Parc atmosphere.

**Implementation**:
- Updated layout composition in `web/src/app/(paddock)/parc-ferme/page.tsx` to a true single-screen flex column shell.
- Removed conflicting gradients/highlights and stabilized the grid background treatment in `web/src/app/globals.css`.
- Enabled dark dock variant for Parc route in:
  - `web/src/components/ui/floating-dock.tsx`
  - `web/src/components/shell/paddock-bottom-nav.tsx`

**Design decision**:
- Treat Parc Fermé as a dedicated “immersive route mode” rather than just another page in the normal white/light paddock flow.

**Why**:
- The route’s visual identity depends on continuity from hero -> rail -> dock; mixed shell theming breaks immersion and reveals seams.

---

#### Phase D - Card Form Language (single clipped layer, collectible realism)
**Issue/goal**:
- improve card visual fidelity while avoiding fake frame artifacts at clipped corners.

**Implementation**:
- Reworked collectible card rendering in `web/src/components/parc-ferme/collectible-card.tsx` and related Parc CSS:
  - single `.parc-show-card` clipped geometry with dog-ear,
  - layered gloss/meta treatment,
  - center-card emphasis and cleaner depth stack.
- Aligned detail panel collectible framing in `web/src/components/parc-ferme/card-detail-view.tsx`.

**Design decision**:
- Use one clipped primary layer (instead of multiple pseudo-frame layers) to avoid transparency mismatches and edge artifacts.

**Tradeoff**:
- Less “ornamental framing” flexibility, but cleaner geometry and fewer rendering artifacts under transforms.

---

#### Phase E - Final user-reported issues: image fill + right white strip
**Final issue from screenshot**:
1. card images were not filling the card face (contain behavior left visible blank area),  
2. a white strip appeared on the right side.

**Root cause analysis**:
- Card rail image slot used constrained dimensions (`~84% x 70%`) plus `object-fit: contain`.
- Global `body` is white by default, so any tiny overflow/gutter/subpixel edge on Parc route exposed a white seam.

**Implementation**:
- In `web/src/app/globals.css`:
  - `.parc-card-image-slot` -> full `inset: 0`
  - `.parc-card-image` -> `object-fit: cover`, tuned `object-position`
  - `.parc-detail-image` -> `cover` with matching positioning
  - added route-scoped root styling:
    - `html.parc-ferme-route, body.parc-ferme-route { background-color: #02050c; overflow-x: clip; }`
- In `web/src/components/shell/paddock-shell.tsx`:
  - added `useEffect` that toggles `parc-ferme-route` class on `html` and `body` only while on `/parc-ferme`
  - tightened full-width container classes to prevent horizontal overflow edge cases
- In `web/src/components/parc-ferme/card-detail-view.tsx`:
  - removed conflicting `object-contain` and padding class from detail image.

**Architecture decision**:
- Use **route-scoped DOM class toggling** for full-bleed root behavior rather than global dark body defaults.

**Why**:
- Preserves existing light-theme routes while guaranteeing Parc route never reveals white under any scroll/gutter condition.

**Tradeoff**:
- Requires client-side mount effect in shell, but keeps theme boundaries explicit and low-risk for the rest of the app.

---

### 7.3 System Architecture Decisions (Consolidated)
1. **Route-mode architecture for Parc Fermé**  
   Parc is treated as a themed runtime mode (layout + dock + root background + interaction rules), not merely a component swap.

2. **Interaction architecture for rails**  
   Drag behavior is modeled as high-frequency input stream -> RAF-batched state commit -> snap resolution. This reduces state thrash and keeps the rail physically responsive.

3. **Asset freshness architecture**  
   Cache invalidation moved into a helper-level URL versioning strategy and route asset policy (`unoptimized` for local cards + low TTL config) for deterministic iteration.

4. **Visual layering architecture**  
   Card face, gloss, and metadata overlays were reorganized to maintain depth while keeping image fill predictable across clipping + transforms.

5. **Scoped theming boundary**  
   Full-bleed dark behavior is applied only on `/parc-ferme` via explicit classing, preventing collateral regressions in other paddock routes.

---

### 7.4 Validation and Reliability Notes
- Production build passed after final fixes (`next build`).
- Lint warning (`max-w-[100%]`) was addressed by moving to `max-w-full`.
- Remaining fine-tuning expected: per-driver face framing may require slight `object-position` adjustments if any specific portrait crops unfavorably.

---

### 7.5 Final Outcome for This Session
At the end of this chat, Parc Fermé behavior is aligned with the user’s target:
- card images fill the collectible face,
- right-edge white strip is removed through route-scoped full-bleed root styling,
- drag rail remains smooth under mobile interaction pressure,
- asset swaps are immediately reflected without stale-cache confusion,
- and the entire view maintains a consistent dark premium presentation from headline to dock.

