# Route Audit: Host Server (/host)

## Overview & Visual Representation
- **Route Path**: `/host`
- **Component**: `HostComponent` (`frontend/src/app/features/host/host.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/host.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/host/populated-1920x1080-dark.png` | `screenshots/host/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/host/populated-1440x900-dark.png` | `screenshots/host/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/host/populated-1280x720-dark.png` | `screenshots/host/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/host/populated-768x1024-dark.png` | `screenshots/host/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/host/populated-390x844-dark.png` | `screenshots/host/populated-390x844-light.png` |

---

## Findings

### DF-036 ARIA progress bars lack accessible names (aria-progressbar-name violation)
- Route(s): `/host`
- Category / Severity / Impact / Effort: A11Y / S1 / 4 / XS
- What is wrong: Custom CPU, Memory, and Disk progress gauges have `role="progressbar"` with `aria-valuenow` and `aria-valuemax`, but omit `aria-label` or `aria-labelledby`.
- Evidence: `frontend/src/app/features/host/host.component.html:128-154`, axe SERIOUS violation `aria-progressbar-name`.
- Why it matters: Screen readers announce "progressbar 64%" without context on whether it represents CPU load, swap space, or root disk partition.
- Recommended fix: Add `aria-label="Host CPU utilization"`, `aria-label="Host memory utilization"`, and `aria-label="Disk storage utilization"`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-037 Inadequate text contrast on process table headers in light theme
- Route(s): `/host`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Host process table headers (`PID`, `COMMAND`, `CPU%`, `MEM%`, `USER`) render `#94A3B8` on `#FFFFFF` in light theme, measuring 2.45:1 contrast, failing WCAG AA.
- Evidence: `screenshots/host/populated-1440x900-light.png`, `frontend/src/app/features/host/host.component.scss:184`, axe violation `color-contrast`.
- Why it matters: Process table headers become nearly invisible under bright office lighting.
- Recommended fix: Bind `.table-header` text to `var(--text-dim)` which resolves to `#545268` in light theme (contrast 5.8:1).
- Related redesign file: `docs/design/pages/host.md`

### DF-038 Inline style transforms and delays on gauge animations
- Route(s): `/host`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Gauge needle indicators and bar heights are animated via inline HTML expressions: `[style.transform]="'rotate(' + angle + 'deg)'"` and `[style.animation-delay]="idx * 40 + 'ms'"`.
- Evidence: `frontend/src/app/features/host/host.component.html:136, 142, 148, 188`.
- Why it matters: Clutters template syntax and triggers Angular change detection evaluations on every timer tick.
- Recommended fix: Consolidate gauge visual styling into an isolated `dp-gauge` or `dp-radial-metric` component using CSS custom properties (`--gauge-val`).
- Related redesign file: `docs/design/spec/05-dataviz.md`

### DF-039 Host info grid wastes vertical space on 1440x900 viewport
- Route(s): `/host`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / S
- What is wrong: On standard 1440x900 displays, the top system info cards (OS, Kernel, Uptime, Docker socket) push the real-time resource graphs completely below the fold.
- Evidence: `screenshots/host/populated-1440x900-dark.png`.
- Why it matters: Operators must scroll immediately upon page load to view the primary operational data (CPU and RAM history).
- Recommended fix: Condense static host metadata into a compact horizontal breadcrumb bar or metadata strip above the main chart canvas.
- Related redesign file: `docs/design/pages/host.md`

### DF-040 Truncated command strings in process table without tooltips
- Route(s): `/host`
- Category / Severity / Impact / Effort: COMPONENT / S3 / 3 / S
- What is wrong: Long container daemon commands (e.g. `/usr/local/bin/dockerd --containerd=/run/containerd/containerd.sock`) are cut off with `text-overflow: ellipsis` but have no hover tooltip or expansion modal.
- Evidence: `screenshots/host/populated-1440x900-dark.png`, `frontend/src/app/features/host/host.component.html:268`.
- Why it matters: Operators cannot inspect command arguments, configuration flags, or file paths without opening an external shell.
- Recommended fix: Add `[matTooltip]="proc.command"` and a click-to-copy action on process table rows.
- Related redesign file: `docs/design/pages/host.md`

---

## What Works Well
- Real-time gauge needles and mini sparklines give an authentic instrument panel aesthetic.
- The dual-pane layout separates physical host resources from container runtime overhead.
- Storage partition breakdown clearly displays mount targets and percentage thresholds.

---

## Top 3 Improvements
1. Add explicit `aria-label` to all radial progress bars and meters.
2. Relocate static system metadata to a compact banner so time-series charts appear above the fold on 900p screens.
3. Fix light theme table header contrast to comply with WCAG AA.
