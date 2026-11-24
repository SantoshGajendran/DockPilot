# Route Audit: Containers (/containers)

## Overview & Visual Representation
- **Route Path**: `/containers`
- **Component**: `ContainersListComponent` (`frontend/src/app/features/containers/containers-list.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/containers.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/containers/populated-1920x1080-dark.png` | `screenshots/containers/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/containers/populated-1440x900-dark.png` | `screenshots/containers/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/containers/populated-1280x720-dark.png` | `screenshots/containers/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/containers/populated-768x1024-dark.png` | `screenshots/containers/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/containers/populated-390x844-dark.png` | `screenshots/containers/populated-390x844-light.png` |
| **Empty State** | `screenshots/containers/empty-1440x900-dark.png` | N/A |
| **Viewer Role View** | `screenshots/containers/viewer-role-1440x900-dark.png` | N/A |

---

## Findings

### DF-014 Icon action buttons lack accessible names (button-name violation)
- Route(s): `/containers`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Inline quick-action buttons (Start, Stop, Restart, Terminal, Logs) render only `<dp-icon>` child elements without `aria-label` or inner text.
- Evidence: `frontend/src/app/features/containers/containers-list.component.html:142-168`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users hear "button" with zero indication of whether clicking will restart, stop, or delete a production container.
- Recommended fix: Add explicit `[attr.aria-label]="'Restart container ' + c.name"` and `matTooltip` on every action button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-015 Container name anchor link lacks accessible name (link-name violation)
- Route(s): `/containers`
- Category / Severity / Impact / Effort: A11Y / S1 / 4 / XS
- What is wrong: Container name links that include an icon and truncated text fail the accessible name computation when truncated via CSS text-overflow.
- Evidence: `frontend/src/app/features/containers/containers-list.component.html:86`, axe SERIOUS violation `link-name`.
- Why it matters: Screen readers can announce empty or partial link targets.
- Recommended fix: Add `[attr.aria-label]="'View details for container ' + c.name"` to the `<a>` tag.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-016 Horizontal table scroll and truncated columns on tablet/mobile
- Route(s): `/containers`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 4 / M
- What is wrong: On 768px and 390px viewports, the desktop table layout overflows horizontally (min-width: 820px), requiring clumsy dual-axis swipe scrolling to reach restart/stop actions.
- Evidence: `screenshots/containers/populated-768x1024-dark.png`, `screenshots/containers/populated-390x844-dark.png`.
- Why it matters: Critical quick-action buttons are pushed off-screen on tablets and mobile phones during emergency triage.
- Recommended fix: Implement responsive card switch below 900px (`@media (max-width: 900px)`), rendering compact stacked craft cards with prominent health chips and pinned action buttons.
- Related redesign file: `docs/design/pages/containers.md`

### DF-017 Destructive container actions lack distinct warning styling
- Route(s): `/containers`
- Category / Severity / Impact / Effort: COMPONENT / S2 / 4 / S
- What is wrong: The "Stop" and "Remove" action buttons share the same muted grey icon styling (`#64748B`) as benign actions like "Inspect" and "Logs".
- Evidence: `screenshots/containers/populated-1440x900-dark.png`, `frontend/src/app/features/containers/containers-list.component.scss:88`.
- Why it matters: High cognitive load and accidental-click risk during tense incident remediation.
- Recommended fix: Style destructive actions with hover warning tokens (`color: var(--status-critical); background: rgba(244, 63, 94, 0.1);`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-018 Viewer role renders action buttons with no disabled hint
- Route(s): `/containers`
- Category / Severity / Impact / Effort: IA / S3 / 3 / S
- What is wrong: When authenticated as `viewer`, action buttons are either disabled without explanatory tooltip or silently fail when clicked.
- Evidence: `screenshots/containers/viewer-role-1440x900-dark.png`, `frontend/src/app/features/containers/containers-list.component.html:152`.
- Why it matters: Viewers are confused as to whether the app is unresponsive or if their permissions restrict the operation.
- Recommended fix: Display a padlock icon or badge with tooltip: "Operator or Admin role required to perform control actions".
- Related redesign file: `docs/design/spec/03-app-shell.md`

### DF-019 Missing batch selection feedback on total fleet row
- Route(s): `/containers`
- Category / Severity / Impact / Effort: COMPONENT / S3 / 3 / S
- What is wrong: Selecting multiple checkboxes displays a floating batch action bar, but the table rows lack an active selected highlight border, making it unclear which rows are included in the batch.
- Evidence: `screenshots/containers/populated-1440x900-dark.png`, `frontend/src/app/features/containers/containers-list.component.scss:132`.
- Why it matters: Accidental batch execution (e.g. bulk restarting 5 containers instead of 2).
- Recommended fix: Apply `&.selected { background: rgba(139, 92, 246, 0.08); border-left: 2px solid var(--violet); }` to selected rows.
- Related redesign file: `docs/design/pages/containers.md`

---

## What Works Well
- Filtering by container status (running, stopped, degraded) updates instantly via signals.
- Memory and CPU usage values are rendered in monospace JetBrains Mono for clean numeric scanning.
- Batch action bar provides quick bulk Start/Stop/Restart capabilities.

---

## Top 3 Improvements
1. Add explicit `aria-label` attributes to all action buttons and links to resolve Critical accessibility violations.
2. Introduce responsive stacked card layout for viewport widths below 900px.
3. Apply semantic color coding (`var(--status-critical)`) and explicit confirmation dialogs on destructive actions.
