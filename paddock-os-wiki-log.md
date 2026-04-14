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
