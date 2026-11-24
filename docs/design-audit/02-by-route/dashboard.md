# Route Audit: Dashboard (/dashboard)

## Overview & Visual Representation
- **Route Path**: `/dashboard`
- **Component**: `DashboardComponent` (`frontend/src/app/features/dashboard/dashboard.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/dashboard.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/dashboard/populated-1920x1080-dark.png` | `screenshots/dashboard/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/dashboard/populated-1440x900-dark.png` | `screenshots/dashboard/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/dashboard/populated-1280x720-dark.png` | `screenshots/dashboard/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/dashboard/populated-768x1024-dark.png` | `screenshots/dashboard/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/dashboard/populated-390x844-dark.png` | `screenshots/dashboard/populated-390x844-light.png` |

---

## Findings

### DF-007 Low contrast micro-labels in fleet health summary card
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: The card metric descriptions ("RUNNING CONTAINERS", "DEGRADED CONTAINERS", "MEMORY USAGE RATIO") render `#64748B` on `#0E1017`, measuring 3.42:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/dashboard/populated-1440x900-dark.png`, `frontend/src/app/features/dashboard/dashboard.component.scss:64`, axe violation `color-contrast`.
- Why it matters: Operators glancing at flight deck telemetry cannot quickly discern health states in low-contrast ambient environments.
- Recommended fix: Change color to `var(--text-dim)` (`#A09EB4` in dark, `#545268` in light), achieving 5.8:1 contrast.
- Related redesign file: `docs/design/pages/dashboard.md`

### DF-008 Layout shift (CLS 0.031) on 2s telemetry ticker updates
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: PERF / S2 / 5 / M
- What is wrong: Every 2 seconds when SSE pushes updated CPU/memory figures, changing numeric widths cause sibling elements and gauge bars to jitter horizontally.
- Evidence: Measured CLS max shift score 0.03065 in 15s performance profile, `scratch/audit_data.json:sseProfile`.
- Why it matters: Subconscious visual instability causes eye fatigue and makes data reading difficult during active load spikes.
- Recommended fix: Apply `font-variant-numeric: tabular-nums;` and fix metric value container widths (`min-width: 64px; text-align: right;`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-009 Inlined style width percentage on resource progress bars
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Resource utilization gauges utilize inline `[style.width.%]="metric.cpu"` and `[style.width.%]="metric.memory"` without GPU-accelerated transforms.
- Evidence: `frontend/src/app/features/dashboard/dashboard.component.html:81, 104, 127, 150`.
- Why it matters: Animating `width` triggers full browser layout recalculations every 2 seconds rather than composite-only GPU updates.
- Recommended fix: Refactor progress fills to `transform: scaleX(calc(var(--val) / 100)); transform-origin: left; will-change: transform;`.
- Related redesign file: `docs/design/spec/05-dataviz.md`

### DF-010 Lack of visual hierarchy in equal-sized KPI card grid
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 4 / S
- What is wrong: The 4 top metric cards (Containers, CPU, RAM, Network) share identical square dimensions (`1fr 1fr 1fr 1fr`) with equal visual weight, diluting critical fleet health status.
- Evidence: `screenshots/dashboard/populated-1440x900-dark.png`, `frontend/src/app/features/dashboard/dashboard.component.scss:18`.
- Why it matters: A "sea of cards" template look that fails to direct the operator's eye to high-priority incidents or outliers.
- Recommended fix: Implement an asymmetric hero layout where the primary Fleet Status occupies 2fr with integrated sparkline, and peripheral host stats occupy 1fr each.
- Related redesign file: `docs/design/pages/dashboard.md`

### DF-011 Inconsistent status badge colors bypassing semantic tokens
- Route(s): `/dashboard`, `/containers`
- Category / Severity / Impact / Effort: COLOUR / S3 / 4 / S
- What is wrong: Container state tags hardcode `#10B981` (green), `#F59E0B` (amber), `#F43F5E` (rose), and `#64748B` (slate) directly in component SCSS instead of utilizing `--status-*` tokens.
- Evidence: `frontend/src/app/features/dashboard/dashboard.component.scss:112-140`.
- Why it matters: Disconnected color values prevent synchronized theme tweaking and create tone mismatches between charts, cards, and data tables.
- Recommended fix: Replace with `var(--status-running)`, `var(--status-warning)`, `var(--status-critical)`, and `var(--status-stopped)`.
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-012 Missing empty state handling when zero containers exist
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: STATE / S2 / 3 / S
- What is wrong: When the backend reports 0 containers, the dashboard displays zeroed gauges (`0/0 (0%)`) with no guidance or call-to-action to deploy or discover containers.
- Evidence: `frontend/src/app/features/dashboard/dashboard.component.html:42-60` (lacks empty state block).
- Why it matters: New users are greeted by dead instruments rather than an encouraging onboarding ramp.
- Recommended fix: Add `@if (totalContainers === 0)` empty state banner with "Deploy Compose Stack" and "Pull Image" quick action links.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

---

## What Works Well
- Overview collector provides fast live telemetry updates without noticeable connection drops.
- Glass panels create pleasant cockpit depth against the subtle film grain background.
- Responsive layout stacks cards into a clean 2-column or 1-column layout on tablet and mobile viewports.

---

## Top 3 Improvements
1. Enforce `font-variant-numeric: tabular-nums` to eliminate layout shift (CLS) during 2s data ticks.
2. Replace inline width animations with GPU-accelerated CSS `transform: scaleX(...)`.
3. Introduce asymmetric card hierarchy elevating active alerts and degraded services above routine metrics.
