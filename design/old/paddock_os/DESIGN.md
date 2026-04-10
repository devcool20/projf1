# Design System: The Paddock OS Strategy Guide

## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Cockpit"**
This design system is engineered for high-velocity decision-making. It rejects the static, flat nature of standard enterprise dashboards in favor of a "Kinetic Cockpit" philosophy—where data feels alive, urgent, and pressurized. 

The system breaks the "template" look through **intentional asymmetry** and **high-contrast layering**. We do not align elements to a simple grid; we stack them like aerodynamic components. We use a combination of ultra-sharp aggressive typography and soft, atmospheric radial glows to mimic the environment of a night race under floodlights. Every pixel must feel like it was tuned for performance.

---

## 2. Colors & Atmospheric Depth
The palette is rooted in a "Matte Obsidian" void, allowing telemetry data to "pierce" the dark.

### The Palette
- **Base Surface:** `background` (#0e0e10) / `surface_container_lowest` (#000000)
- **Primary Accents (Team Neon):** 
    - *Papaya:* `primary` (#ff9b48)
    - *Teal:* `secondary` (#7ef6ee)
    - *Ferrari Red:* `tertiary` (#ff725d)
- **Functional States:** `error` (#ff7351) for "Brake Heat" or Critical Alarms.

### The "No-Line" Rule
Sectioning must never be achieved with 1px solid dividers. Boundaries are defined by:
1.  **Tonal Shifts:** Placing a `surface_container_high` card against the `surface_dim` background.
2.  **Glow-Boundary:** Using a subtle `primary` radial gradient behind a container to lift it from the background.
3.  **Negative Space:** Utilizing the `Spacing Scale (16/20/24)` to create clear air between telemetry blocks.

### The Glass & Gradient Rule
Floating modules (e.g., the Pit Wall) must utilize **Glassmorphism**. 
- **Recipe:** `surface_variant` at 40% opacity + 20px Backdrop Blur. 
- **Signature Texture:** Apply a linear gradient from `primary` to `primary_container` (at 15% opacity) as a subtle "sheen" on top of glass cards to give them a physical, polycarbonate feel.

---

## 3. Typography: The Aerodynamic Scale
Typography is our primary vehicle for hierarchy. We pair the aggressive, wide apertures of Space Grotesk with the technical precision of JetBrains Mono.

| Level | Token | Font | Tracking | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Space Grotesk | -0.04em | Race positions, Lap times. |
| **Headline**| `headline-md` | Space Grotesk | -0.02em | Section headers, Driver names. |
| **Data** | `title-md` | JetBrains Mono | 0 | Telemetry, Coordinates, Tech specs. |
| **Body** | `body-md` | Inter | +0.01em | Strategy briefings, Team comms. |
| **Label** | `label-sm` | Inter (All Caps) | +0.1em | Micro-metadata, Status tags. |

---

## 4. Elevation & Tonal Layering
We move away from traditional drop shadows. Elevation in this system is a result of **Luminance and Blur**.

*   **The Layering Principle:** 
    - Level 0 (Track): `surface_dim` (#0e0e10)
    - Level 1 (Chassis): `surface_container_low` (#131315)
    - Level 2 (Components): `surface_container_highest` (#262528)
*   **Ambient Shadows:** For floating modals, use a shadow color of `primary` at 8% opacity with a 40px blur. This creates a "glow" rather than a shadow, simulating an illuminated dashboard.
*   **The "Ghost Border" Fallback:** If a container requires definition in high-data density areas, use `outline_variant` (#48474a) at 15% opacity. It should feel felt, not seen.

---

## 5. Components & Interface Elements

### Buttons: 'Transmit' & 'Equip'
- **Primary ('Transmit'):** Solid `primary` background. Sharp `none` or `sm` corners. On hover, apply a `primary_dim` outer glow (8px blur) to simulate "Brake Heat."
- **Secondary ('Equip'):** Ghost style. `outline` border (20% opacity). On hover, border opacity jumps to 100% with a `secondary` text color shift.

### The 'Pit Wall' Dock
A persistent, collapsible vertical navigation. 
- **Style:** `surface_container_lowest` with a 1px `secondary` (Teal) glow on the leading edge. 
- **Motion:** Use a "Quick-In, Slow-Out" easing to mimic the snap of a mechanical tool.

### Telemetry Cards
- **Rule:** Forbid divider lines. Use `surface_container` shifts to separate the header from the data. 
- **Avatars:** All driver/engineer images must use the **Helmet-Visor Crop** (a custom shape masking the top-right and bottom-left with a `xl` radius, while keeping others at `none`).

### Input Fields
- **State:** Active inputs use a `secondary` (Teal) bottom-border only (2px). 
- **Typography:** Placeholder text must be `JetBrains Mono` at `label-md` to maintain the technical aesthetic.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use aggressive asymmetry. A card can be slightly wider than the one below it to create visual kinetic energy.
- **Do** lean into "The Glow." Use `primary` or `tertiary` radial gradients at low opacities (5-10%) in the background corners of the UI to prevent the dark mode from feeling "dead."
- **Do** use `JetBrains Mono` for any number that changes frequently (Lap times, KPH).

### Don't:
- **Don't** use standard `lg` or `full` rounded corners on primary containers. This is an aggressive system; keep it sharp (`none` or `sm`).
- **Don't** use pure white (#FFFFFF) for text. Use `on_surface` (#f9f5f8) to reduce eye strain against the Matte Obsidian background.
- **Don't** use centered layouts. Dashboards should be weighted to the left or right to feel like a wrap-around cockpit.

### Accessibility Note:
Ensure that neon accents like `secondary` (Teal) against `surface_container` maintain a 4.5:1 contrast ratio. When using Glassmorphism, ensure the `backdrop-filter: blur` is high enough (min 20px) to keep text legible over background movement.