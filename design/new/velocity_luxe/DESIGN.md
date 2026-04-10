# Design System Specification: High-End Editorial Dashboard

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Kinetic Curator."** 

This design system is a fusion of the high-velocity, data-driven world of Formula 1 and the sophisticated, spacious layout of a premium lifestyle magazine. It rejects the "industrial" coldness of traditional dashboards in favor of a warm, editorial experience. We achieve this through a "Bento-style" grid that prioritizes breathing room, hyper-rounded forms, and intentional asymmetry. The goal is to make technical data feel like a curated story, using light and depth rather than lines and boxes.

---

## 2. Colors: Tonal Architecture
The palette is built on a base of soft, light asphalt and elevated with high-chroma electric accents.

### The "No-Line" Rule
**Strict Mandate:** 1px solid borders are prohibited for sectioning or container definition. Boundaries must be defined exclusively through background color shifts or tonal transitions.
*   **Surface Hierarchy:** Use `surface-container-low` (#eff1f2) for the primary dashboard background. 
*   **Nesting Logic:** To define a card, place a `surface-container-lowest` (#ffffff) card on top of the background. To nest a secondary element within that card, use `surface-container` (#e6e8ea).

### Signature Effects
*   **The "Aura" Glow:** Grid items should utilize the `primary` (Electric Purple), `secondary` (Sunset Orange), or `tertiary` (Mint Green) tokens as subtle ambient glows. Apply a 64px Gaussian blur to a low-opacity (15%) shape positioned behind the card corner to signify "team" or "status" affiliation.
*   **Glass & Gradient:** Floating elements (like the navigation dock) must use a semi-transparent `surface` with a 20px backdrop-blur. Main CTAs should use a linear gradient from `primary` (#9500c8) to `primary_container` (#d978ff) to add "soul" and depth.

---

## 3. Typography: The Editorial Voice
We use **Plus Jakarta Sans** for its geometric clarity and friendly modernism. 

*   **Display (Large/Medium):** Reserved for hero data points (e.g., race countdowns). Use these sparingly to create a "magazine cover" hierarchy.
*   **Headline & Title:** Use for card headers. The transition from `headline-sm` to `body-lg` creates a high-contrast relationship that feels intentional and premium.
*   **Labels:** Use `label-md` in uppercase with +5% letter spacing for technical metadata (e.g., "PIT WINDOW OPEN") to mimic F1 telemetry styling.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are replaced by **Ambient Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking" surface tokens. 
    *   *Base:* `surface`
    *   *Section:* `surface_container_low`
    *   *Card:* `surface_container_lowest`
*   **Ambient Shadows:** If a card requires a "lift" (e.g., on hover), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(44, 47, 48, 0.06)`. The shadow color must be a tinted version of `on_surface` to look natural.
*   **The "Ghost Border" Fallback:** For accessibility in high-glare environments, use the `outline_variant` token at **15% opacity**. Never use 100% opaque outlines.

---

## 5. Components: Fluid Primitives

### Buttons & Chips
*   **Shapes:** All buttons use `rounded-xl` (3rem) or `rounded-full`. 
*   **Primary Button:** Gradient fill (`primary` to `primary_container`) with `on_primary` text.
*   **Chips:** Use `surface_container_highest` for the background. No border. For "Active" states, use the `tertiary` (Mint Green) aura effect.

### The Floating Pill Dock
*   **Styling:** A semi-transparent pill centered at the bottom of the viewport. 
*   **Surface:** `surface_container_lowest` at 80% opacity with a `24px` backdrop-blur. 
*   **Radius:** `rounded-full`.

### Cards & Bento Items
*   **Radius:** Standardize on `rounded-lg` (2rem/32px) for large containers.
*   **Content Separation:** Forbid divider lines. Use `spacing-6` (1.5rem) of vertical white space to separate list items within a card, or a subtle shift to `surface_container_low` for the list item background.

### Input Fields
*   **Style:** Minimalist. Use `surface_container_low` with a `rounded-md` (1.5rem) corner. 
*   **Focus State:** Instead of a border, use a 2px outer glow in `primary_dim`.

---

## 6. Do's and Don'ts

### Do
*   **Do** embrace asymmetry. Allow one Bento card to span 2 columns while its neighbor spans 1.
*   **Do** use "Aura" glows to guide the eye toward high-priority data.
*   **Do** ensure Plus Jakarta Sans has ample line-height (`1.5` for body text) to maintain the editorial feel.
*   **Do** use `surface_bright` to highlight active interactive states.

### Don't
*   **Don't** use black (#000000) for text. Always use `on_surface` (#2c2f30) for a softer, premium contrast.
*   **Don't** use sharp corners. Every interactive and container element must adhere to the `rounded-md` to `rounded-xl` scale.
*   **Don't** use standard "Material Design" shadows. Keep elevations flat or use ultra-diffused ambient light.
*   **Don't** clutter. If a card has more than 5 data points, it likely needs to be split into two Bento cells.