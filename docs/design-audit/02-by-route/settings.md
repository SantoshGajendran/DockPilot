# Route Audit: Settings (/settings)

## Overview & Visual Representation
- **Route Path**: `/settings`
- **Component**: `SettingsComponent` (`frontend/src/app/features/settings/settings.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles; edits restricted by role)
- **Redesign Spec Reference**: `docs/design/pages/users-profile-settings.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/settings/populated-1920x1080-dark.png` | `screenshots/settings/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/settings/populated-1440x900-dark.png` | `screenshots/settings/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/settings/populated-1280x720-dark.png` | `screenshots/settings/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/settings/populated-768x1024-dark.png` | `screenshots/settings/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/settings/populated-390x844-dark.png` | `screenshots/settings/populated-390x844-light.png` |

---

## Findings

### DF-097 Unlabelled numeric inputs in retention settings (label violation)
- Route(s): `/settings`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Numeric inputs for metrics retention days and event log pruning thresholds lack associated `<label>` tags or `aria-label` attributes.
- Evidence: `frontend/src/app/features/settings/settings.component.html:142-168`, axe CRITICAL violation `label`.
- Why it matters: Screen reader users cannot tell whether a numeric field configures audit retention, metric sampling rate, or disk warning limits.
- Recommended fix: Add explicit `aria-label="Metrics retention period in days"` and `aria-label="Event log retention days"`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-098 Deep selector ::ng-deep overriding slide toggle tracks
- Route(s): `/settings`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Custom switch track colors are forced using `::ng-deep .mat-mdc-slide-toggle .mdc-switch__track { background-color: var(--bg-3) !important; }`.
- Evidence: `frontend/src/app/features/settings/settings.component.scss:391`.
- Why it matters: Deprecated `::ng-deep` selector leaks across all other slide toggles in the application.
- Recommended fix: Use Angular Material theme tokens in `theme.scss` (`--mdc-switch-selected-track-color: var(--gold)`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-099 Low contrast setting description copy in dark theme
- Route(s): `/settings`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Explanatory helper paragraphs under setting toggles render `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/settings/populated-1440x900-dark.png`, `frontend/src/app/features/settings/settings.component.scss:84`, axe violation `color-contrast`.
- Why it matters: Operators cannot read critical setting side effects (e.g. telemetry implications, retention disk usage).
- Recommended fix: Bind description copy to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-100 Sticky save footer covers bottom setting inputs on mobile
- Route(s): `/settings`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 4 / S
- What is wrong: On mobile (390px), the sticky bottom action bar ("SAVE CHANGES", "DISCARD") overlaps the last input field without adding compensatory `padding-bottom` to the scrollable container.
- Evidence: `screenshots/settings/populated-390x844-dark.png`, `frontend/src/app/features/settings/settings.component.scss:284`.
- Why it matters: Users cannot tap or edit the final configuration field on mobile devices.
- Recommended fix: Add `padding-bottom: 96px;` to `.settings-container` on `@media (max-width: 600px)`.
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-101 Non-standard 10px spacing in configuration panels
- Route(s): `/settings`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: Setting section cards use `padding: 18px 22px; gap: 10px;` violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/settings/settings.component.scss:42`.
- Why it matters: Subtle visual misalignment when transitioning between dashboard and settings cards.
- Recommended fix: Align to `padding: 20px 24px; gap: 12px;` (`var(--space-5) var(--space-6)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

---

## What Works Well
- `pendingChangesGuard` prevents accidental data loss if the user navigates away with unsaved changes.
- Setting groups are logically structured into Engine, Retention, Telemetry, and Atmosphere.
- Live preview for quiet mode and theme switches applies instantaneously.

---

## Top 3 Improvements
1. Add accessible labels to all numeric retention input elements.
2. Fix sticky save bar overlap on mobile viewports.
3. Migrate `::ng-deep` toggle overrides to Angular Material theme variables.
