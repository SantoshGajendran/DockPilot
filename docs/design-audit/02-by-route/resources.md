# Route Audit: Docker Resources (/resources)

## Overview & Visual Representation
- **Route Path**: `/resources`
- **Component**: `ResourcesComponent` (`frontend/src/app/features/resources/resources.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/resources.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/resources/populated-1920x1080-dark.png` | `screenshots/resources/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/resources/populated-1440x900-dark.png` | `screenshots/resources/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/resources/populated-1280x720-dark.png` | `screenshots/resources/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/resources/populated-768x1024-dark.png` | `screenshots/resources/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/resources/populated-390x844-dark.png` | `screenshots/resources/populated-390x844-light.png` |
| **Empty State** | `screenshots/resources/empty-1440x900-dark.png` | N/A |

---

## Findings

### DF-070 Resource action buttons lack accessible names (button-name violation)
- Route(s): `/resources`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Delete image, inspect volume, and remove network buttons render `<dp-icon>` elements without `aria-label` or accessible text.
- Evidence: `frontend/src/app/features/resources/resources.component.html:112-148`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users cannot tell which button removes a storage volume versus pulling an image.
- Recommended fix: Add `[attr.aria-label]="action.label + ' for ' + item.name"` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-071 Legacy hardcoded Material palette in Prune Wizard Dialog
- Route(s): `/resources`
- Category / Severity / Impact / Effort: VISUAL / S2 / 3 / S
- What is wrong: The prune confirmation wizard introduces generic material colors `#FF9800` (amber 500), `#E65100` (amber 900), and `#666` completely uncoordinated with the obsidian/gold Flight Deck aesthetic.
- Evidence: `frontend/src/app/features/resources/dialogs/prune-wizard-dialog.component.scss:28, 44, 76`.
- Why it matters: Breaks immersion and visual identity, looking like a stock admin template dialog pasted into the application.
- Recommended fix: Restyle the prune dialog using `var(--gold)` for primary confirm, `var(--status-critical)` for destructive warnings, and `var(--bg-2)` for the card surface.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-072 Two-stage prune confirmation lacks clear disk reclaim preview
- Route(s): `/resources`
- Category / Severity / Impact / Effort: IA / S2 / 4 / S
- What is wrong: Initiating system prune asks "Are you sure?" without calculating or displaying the estimated reclaimable disk space (GB) before the user confirms.
- Evidence: `frontend/src/app/features/resources/dialogs/prune-wizard-dialog.component.html:34-58`.
- Why it matters: Operators hesitate or fear unintended data loss because they cannot preview what will be freed.
- Recommended fix: Include a dry-run summary breakdown: "Reclaimable: 1.4 GB (3 unused images, 1 dangling volume, 0 networks)".
- Related redesign file: `docs/design/pages/resources.md`

### DF-073 Low contrast resource size values in light theme
- Route(s): `/resources`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Image and volume virtual sizes ("142.8 MB", "2.1 GB") render `#94A3B8` on `#FFFFFF` in light theme, measuring 2.45:1 contrast, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/resources/populated-1440x900-light.png`, `frontend/src/app/features/resources/resources.component.scss:92`, axe violation `color-contrast`.
- Why it matters: Critical storage metrics are hard to read under bright display conditions.
- Recommended fix: Set color to `var(--text-dim)` (`#545268` in light mode, contrast 5.8:1).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-074 Non-standard 6px gap in resource tab filters
- Route(s): `/resources`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The filter pill group for dangling/all toggle uses `gap: 6px;` rather than the standard 4px or 8px scale.
- Evidence: `frontend/src/app/features/resources/resources.component.scss:36`.
- Why it matters: Sub-pixel misalignment relative to 8px and 16px container padding.
- Recommended fix: Update gap to `8px` (`var(--space-2)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

---

## What Works Well
- Clear separation between Images, Volumes, and Networks with real-time count badges.
- Image size sorting allows operators to quickly identify disk-hogging images.
- Prune wizard confirmation token prevents accidental destructive execution.

---

## Top 3 Improvements
1. Restyle Prune Wizard dialog to eliminate legacy `#FF9800` stock colors in favor of Flight Deck tokens.
2. Provide disk space reclaim estimates prior to prune execution.
3. Add accessible names to all resource action buttons.
