# Route Audit: Logs Explorer (/logs)

## Overview & Visual Representation
- **Route Path**: `/logs`
- **Component**: `LogsExplorerComponent` (`frontend/src/app/features/logs/logs-explorer.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/logs.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/logs/populated-1920x1080-dark.png` | `screenshots/logs/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/logs/populated-1440x900-dark.png` | `screenshots/logs/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/logs/populated-1280x720-dark.png` | `screenshots/logs/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/logs/populated-768x1024-dark.png` | `screenshots/logs/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/logs/populated-390x844-dark.png` | `screenshots/logs/populated-390x844-light.png` |
| **Empty State** | `screenshots/logs/empty-1440x900-dark.png` | N/A |

---

## Findings

### DF-029 Unlabelled search input violates form accessibility (label violation)
- Route(s): `/logs`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The primary log search text input (`placeholder="Search logs with regex or tokens..."`) lacks an associated `<label>` element, `aria-label`, or `aria-labelledby` attribute.
- Evidence: `frontend/src/app/features/logs/logs-explorer.component.html:47`, axe CRITICAL violation `label`.
- Why it matters: Screen reader users cannot understand the purpose of the primary search field.
- Recommended fix: Add `aria-label="Search container logs"` to the `<input>` element.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-030 Log stream control buttons lack accessible names (button-name violation)
- Route(s): `/logs`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Action buttons in the log viewer toolbar (Pause/Resume, Wrap Lines, Clear, Download, Scroll to Bottom) render icon-only without accessible names.
- Evidence: `frontend/src/app/shared/components/log-viewer/log-viewer.component.html:12-38`, axe CRITICAL violation `button-name`.
- Why it matters: Assistive technology announces "button" without identifying playback, wrapping, or export functions.
- Recommended fix: Add explicit `[attr.aria-label]="action.tooltip"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-031 Multiple ::ng-deep overrides in log explorer styling
- Route(s): `/logs`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / S
- What is wrong: `logs-explorer.component.scss` contains 4 separate `::ng-deep` selector blocks (lines 27, 33, 143, 369) targeting MatCheckbox, MatSelect, and MatFormField components.
- Evidence: `frontend/src/app/features/logs/logs-explorer.component.scss:27, 33, 143, 369`.
- Why it matters: Fragile CSS architecture that breaks across Angular Material minor version upgrades and leaks custom form field heights globally.
- Recommended fix: Standardize form field density via Angular Material density tokens (`@include mat.form-field-density(-3)`) in `styles.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-032 Fleet selector sidebar consumes excessive horizontal width on mobile
- Route(s): `/logs`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 4 / M
- What is wrong: On mobile (390px) and tablet (768px), the "TARGET FLEET" container list is fixed above the search bar, forcing the log stream below the fold and leaving only ~250px vertical height for log lines.
- Evidence: `screenshots/logs/populated-390x844-dark.png`, `screenshots/logs/populated-768x1024-dark.png`.
- Why it matters: Severely compromises mobile triage efficiency; users spend most of their time scrolling past container checkboxes rather than reading error logs.
- Recommended fix: Collapse the target fleet into a horizontal chip drawer or dropdown filter sheet on viewports under 1024px.
- Related redesign file: `docs/design/pages/logs.md`

### DF-033 Low contrast timestamp text in log stream
- Route(s): `/logs`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: The `.log-ts` timestamp column renders `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/logs/populated-1440x900-dark.png`, `frontend/src/app/shared/components/log-viewer/log-viewer.component.scss:182`, axe violation `color-contrast`.
- Why it matters: Timestamps are critical for correlating distributed incident timelines; low contrast delays reading.
- Recommended fix: Change color to `var(--text-dim)` (`#A09EB4` dark, `#545268` light).
- Related redesign file: `docs/design/spec/01-foundations.md`

---

## What Works Well
- ANSI color token mappings format stderr, warnings, and error stacks with high visual fidelity.
- Interactive JSON drawer expansion allows fast inspection of structured logging payloads.
- Virtualized viewport maintains smooth 60fps scrolling even with thousands of log entries.

---

## Top 3 Improvements
1. Add `aria-label` to the log search input and all stream playback icon buttons.
2. Collapse the target fleet list into a compact multi-select chip bar on mobile viewports.
3. Migrate `::ng-deep` form field hacks to native Angular Material density theming tokens.
