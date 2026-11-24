# Route Audit: Components Gallery (/dev/components)

## Overview & Visual Representation
- **Route Path**: `/dev/components`
- **Component**: `ComponentsGalleryComponent` (`frontend/src/app/features/dev/components-gallery.component.ts`)
- **Access Level**: Dev Mode Only (`canMatch: isDevMode()`)
- **Redesign Spec Reference**: `docs/design/spec/04-components.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/dev-components/populated-1920x1080-dark.png` | `screenshots/dev-components/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/dev-components/populated-1440x900-dark.png` | `screenshots/dev-components/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/dev-components/populated-1280x720-dark.png` | `screenshots/dev-components/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/dev-components/populated-768x1024-dark.png` | `screenshots/dev-components/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/dev-components/populated-390x844-dark.png` | `screenshots/dev-components/populated-390x844-light.png` |

---

## Findings

### DF-104 Prohibited ARIA attribute on static glass panel (aria-prohibited-attr violation)
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: A11Y / S2 / 3 / XS
- What is wrong: The component showcase panel renders `role="region"` with `aria-valuenow`, triggering an ARIA role violation because `aria-valuenow` is only valid on range widgets (sliders, progressbars).
- Evidence: `frontend/src/app/features/dev/components-gallery.component.html:62`, axe SERIOUS violation `aria-prohibited-attr`.
- Why it matters: Confuses assistive technologies into treating static layout containers as interactive range inputs.
- Recommended fix: Remove `aria-valuenow` from non-range elements.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-105 Component gallery lacks token-driven interactive playground
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: CODE / S3 / 2 / S
- What is wrong: Components are rendered statically with fixed attributes rather than providing interactive knobs (e.g. changing badge status, toggling borderSweep, adjusting padding).
- Evidence: `frontend/src/app/features/dev/components-gallery.component.html:1-120`.
- Why it matters: Developers cannot verify edge-case component behavior (long labels, missing icons) inside the gallery.
- Recommended fix: Introduce interactive signal controls to test component variants dynamically.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-106 Non-standard 14px padding between component showcase cards
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The gallery card grid uses `gap: 14px; padding: 14px;`, violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/dev/components-gallery.component.scss:24`.
- Why it matters: Sets an inconsistent precedent for developers referencing the gallery for design implementation.
- Recommended fix: Align to `gap: 16px; padding: 16px;` (`var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-107 Missing focus ring showcase in button gallery
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: A11Y / S3 / 3 / S
- What is wrong: The button section demonstrates default, hover, and disabled states, but omits `:focus-visible` states.
- Evidence: `frontend/src/app/features/dev/components-gallery.component.html:84-110`.
- Why it matters: Developers cannot visually inspect focus indicators without manually tabbing through the page.
- Recommended fix: Add an explicit "Focus Visible" showcase row demonstrating gold ring indicators.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-108 Hardcoded hex colors in gallery preview background
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: CODE / S3 / 2 / XS
- What is wrong: Showcase cards use hardcoded `background: #0D0F18; border: 1px solid #1E2330;` rather than referencing `var(--bg-2)` and `var(--line)`.
- Evidence: `frontend/src/app/features/dev/components-gallery.component.scss:48`.
- Why it matters: Preview cards do not respond correctly when switching to light theme.
- Recommended fix: Use CSS variables `var(--bg-2)` and `var(--line)`.
- Related redesign file: `docs/design/spec/01-foundations.md`

---

## What Works Well
- Centralizes shared custom components (`dp-glass-panel`, `dp-icon`, `dp-skeleton-shimmer`, `dp-badge`) in one reference location.
- Live theme toggle applies instantly across the gallery.
- Typography scale samples verify font rendering across Space Grotesk and JetBrains Mono.

---

## Top 3 Improvements
1. Remove invalid ARIA attributes from static presentation containers.
2. Bind preview card backgrounds to theme variables to ensure full light mode parity.
3. Standardize gallery spacing to the 4px geometric token scale.
