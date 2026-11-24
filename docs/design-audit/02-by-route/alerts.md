# Route Audit: Alerts & Rules (/alerts)

## Overview & Visual Representation
- **Route Path**: `/alerts`
- **Component**: `AlertsComponent` (`frontend/src/app/features/alerts/alerts.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/alerts.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/alerts/populated-1920x1080-dark.png` | `screenshots/alerts/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/alerts/populated-1440x900-dark.png` | `screenshots/alerts/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/alerts/populated-1280x720-dark.png` | `screenshots/alerts/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/alerts/populated-768x1024-dark.png` | `screenshots/alerts/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/alerts/populated-390x844-dark.png` | `screenshots/alerts/populated-390x844-light.png` |

---

## Findings

### DF-057 Alert silence switches lack accessible names (aria-input-field-name violation)
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The MatSlideToggle component used to silence alert rules renders an internal `<input type="checkbox">` without an accessible name or label.
- Evidence: `frontend/src/app/features/alerts/alerts.component.html:148`, axe SERIOUS violation `aria-input-field-name`.
- Why it matters: Screen readers announce "checkbox unchecked" with no clue which alert rule will be muted.
- Recommended fix: Add `[attr.aria-label]="'Silence alert rule ' + rule.name"` on the `<mat-slide-toggle>`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-058 Rule card action buttons lack accessible text (button-name violation)
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Rule action buttons (Edit Rule, Delete Rule, Test Rule) render `<dp-icon>` elements without `aria-label` or visible text.
- Evidence: `frontend/src/app/features/alerts/alerts.component.html:176-192`, axe CRITICAL violation `button-name`.
- Why it matters: Blind administrators cannot identify or activate edit/delete rule operations.
- Recommended fix: Add `[attr.aria-label]="action.label + ' for rule ' + rule.name"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-059 Deep selector ::ng-deep overriding slide toggle colors
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Slide toggle theming uses `::ng-deep .mat-mdc-slide-toggle .mdc-switch__track { background: var(--bg-3) !important; }`.
- Evidence: `frontend/src/app/features/alerts/alerts.component.scss:313`.
- Why it matters: Bypasses Angular view encapsulation, breaks on Material component refactors, and introduces global style collisions.
- Recommended fix: Use Angular Material theme tokens (`--mdc-switch-selected-track-color`) in `theme.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-060 Acknowledge button lacks optimistic visual feedback
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: MOTION / S3 / 3 / S
- What is wrong: Clicking the "Ack" button on an active alert triggers an asynchronous API call without immediate visual state acknowledgement (spinner or optimistic dimming), causing users to double-click.
- Evidence: Usability Task 5 timing test (`scratch/audit_data.json:taskMetrics`), `frontend/src/app/features/alerts/alerts.component.ts:162`.
- Why it matters: Perceived lag and duplicate acknowledge requests sent to the backend.
- Recommended fix: Immediately update the button state to disabled with an optimistic checkmark animation while the request completes.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

### DF-061 Low contrast threshold values in dark theme
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Alert rule trigger condition descriptions ("CPU > 80% for 5m") render in `#64748B` on `#08090E`, measuring 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/alerts/populated-1440x900-dark.png`, `frontend/src/app/features/alerts/alerts.component.scss:124`, axe violation `color-contrast`.
- Why it matters: Operators glancing at rule thresholds cannot verify trigger limits quickly.
- Recommended fix: Bind threshold strings to `var(--text)` (`#ECEAF4`) with monospace styling.
- Related redesign file: `docs/design/pages/alerts.md`

---

## What Works Well
- Active alerts are visually separated from rule definitions, ensuring immediate incident visibility.
- Notification channel badges indicate where alerts will be dispatched (Slack, Webhook, Email).
- Test Rule button allows operators to verify dispatch pipeline before going live.

---

## Top 3 Improvements
1. Provide accessible `aria-label` attributes on silence toggles and rule action buttons.
2. Implement optimistic visual feedback on the alert acknowledge action.
3. Replace `::ng-deep` toggle overrides with Material design token properties.
