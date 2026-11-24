# Route Audit: Compose Projects (/projects)

## Overview & Visual Representation
- **Route Path**: `/projects`
- **Component**: `ComposeProjectsComponent` (`frontend/src/app/features/compose/compose-projects.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/projects.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/projects/populated-1920x1080-dark.png` | `screenshots/projects/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/projects/populated-1440x900-dark.png` | `screenshots/projects/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/projects/populated-1280x720-dark.png` | `screenshots/projects/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/projects/populated-768x1024-dark.png` | `screenshots/projects/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/projects/populated-390x844-dark.png` | `screenshots/projects/populated-390x844-light.png` |

---

## Findings

### DF-043 Compose stack action buttons lack accessible names (button-name violation)
- Route(s): `/projects`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Quick-action buttons on compose project cards (Compose Up, Down, Restart, View Logs) render icons only without `aria-label` or text equivalents.
- Evidence: `frontend/src/app/features/compose/compose-projects.component.html:84-112`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users cannot tell which button triggers a stack restart versus tearing down all containers.
- Recommended fix: Add `[attr.aria-label]="action.name + ' for project ' + project.name"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-044 Inline style stroke and fill on SVG topology connectors
- Route(s): `/projects`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: SVG graph topology lines connecting services in a project use inline template bindings: `[style.stroke]="service.color"`, `[style.fill]="service.fill"`.
- Evidence: `frontend/src/app/features/compose/compose-projects.component.html:204, 215, 218`.
- Why it matters: Bypasses CSS class inheritance, complicates dual-theme adjustments, and incurs recalculations on hover.
- Recommended fix: Use SVG CSS classes with currentColor and theme CSS variables (`stroke: var(--line-strong);`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-045 Dangerous "Compose Down" action placed adjacent to benign actions
- Route(s): `/projects`
- Category / Severity / Impact / Effort: COMPONENT / S1 / 4 / S
- What is wrong: The "Down" button (which tears down all containers and networks) sits immediately adjacent to the "Restart" button with identical dimensions and standard neutral grey icon color.
- Evidence: `screenshots/projects/populated-1440x900-dark.png`, `frontend/src/app/features/compose/compose-projects.component.html:92-98`.
- Why it matters: High risk of accidental stack destruction during rushed production maintenance.
- Recommended fix: Separate the "Down" action into an overflow menu (`...`) or require a typed confirmation dialog with distinct destructive styling.
- Related redesign file: `docs/design/pages/projects.md`

### DF-046 Low contrast service status pills in light theme
- Route(s): `/projects`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Service count chips ("3/3 RUNNING", "1 DEGRADED") render `#10B981` and `#F59E0B` against a `#FFFFFF` card in light mode, measuring 2.38:1 and 2.15:1 contrast ratios, failing WCAG AA.
- Evidence: `screenshots/projects/populated-1440x900-light.png`, `frontend/src/app/features/compose/compose-projects.component.scss:142`, axe violation `color-contrast`.
- Why it matters: Service health summaries are unreadable in light mode.
- Recommended fix: Use dark-adjusted status tokens for text in light theme (`#047857` for running, `#B45309` for warning).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-047 Services table collapses horizontally on tablet viewports
- Route(s): `/projects`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: On 768px tablet displays, the project services table clips the "Image Tag" and "Ports" columns without enabling smooth touch scrolling or responsive wrap.
- Evidence: `screenshots/projects/populated-768x1024-dark.png`.
- Why it matters: Operators cannot identify which image version is running inside the Compose stack on tablet screens.
- Recommended fix: Prioritize columns on `< 900px` viewports, moving Ports and Volumes into an expandable row drawer.
- Related redesign file: `docs/design/pages/projects.md`

---

## What Works Well
- Hierarchical grouping of containers under their parent Compose stack simplifies multi-container app management.
- Live job streaming output dialog allows real-time monitoring of Docker Compose build and pull operations.
- Clean health indicator lights communicate stack availability at a glance.

---

## Top 3 Improvements
1. Isolate the "Down" action with destructive styling and an explicit confirmation step.
2. Add `aria-label` to all project control buttons to satisfy accessibility requirements.
3. Optimize status badge contrast in light mode to meet WCAG AA standards.
