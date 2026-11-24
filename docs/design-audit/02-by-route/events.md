# Route Audit: Events Timeline (/events)

## Overview & Visual Representation
- **Route Path**: `/events`
- **Component**: `EventsComponent` (`frontend/src/app/features/events/events.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/events.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/events/populated-1920x1080-dark.png` | `screenshots/events/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/events/populated-1440x900-dark.png` | `screenshots/events/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/events/populated-1280x720-dark.png` | `screenshots/events/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/events/populated-768x1024-dark.png` | `screenshots/events/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/events/populated-390x844-dark.png` | `screenshots/events/populated-390x844-light.png` |
| **Empty State** | `screenshots/events/empty-1440x900-dark.png` | N/A |

---

## Findings

### DF-050 Inadequate text contrast on event timestamps in dark theme
- Route(s): `/events`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Event occurrence timestamps and relative times ("3m ago", "14:22:08 UTC") render `#475569` on `#0B0D14`, measuring 2.85:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/events/populated-1440x900-dark.png`, `frontend/src/app/features/events/components/events-timeline.component.scss:64`, axe violation `color-contrast`.
- Why it matters: Operators reviewing past incidents cannot quickly scan time anchors in low-light environments.
- Recommended fix: Update timestamp font color to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/pages/events.md`

### DF-051 Lack of visual pause/resume controls for live stream
- Route(s): `/events`
- Category / Severity / Impact / Effort: COMPONENT / S2 / 3 / S
- What is wrong: As new Docker events arrive via SSE, the timeline auto-prepends new cards, continuously pushing existing items downward while an operator is attempting to read an event payload.
- Evidence: `frontend/src/app/features/events/events.component.html:12-34` (lacks pause toggle button).
- Why it matters: High cognitive frustration; target cards move unexpectedly under the user's cursor during incident analysis.
- Recommended fix: Add a "Pause Feed" toggle button in the timeline header that buffers incoming events with a counter badge ("3 new events - Click to show").
- Related redesign file: `docs/design/pages/events.md`

### DF-052 Non-standard 6px and 10px spacing in timeline connectors
- Route(s): `/events`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The timeline node marker and vertical connecting line use `left: 10px; margin-right: 6px;`, violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/events/components/events-timeline.component.scss:42, 88`.
- Why it matters: Inconsistent alignment with standard 16px and 24px grid containers.
- Recommended fix: Standardize timeline node positioning to `left: 12px; margin-right: 8px;`.
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-053 OOM and Container Die events lack prominent critical alert cues
- Route(s): `/events`
- Category / Severity / Impact / Effort: VISUAL / S2 / 4 / S
- What is wrong: Fatal container events like `oom` and `die (exitCode 137)` are styled identically to routine events like `exec_create` and `start`, using a thin 1px outline with no alert badge.
- Evidence: `screenshots/events/populated-1440x900-dark.png`, `frontend/src/app/features/events/components/events-timeline.component.scss:118`.
- Why it matters: Operators scanning hundreds of event entries easily miss critical container crashes.
- Recommended fix: Give OOM and non-zero exit events a distinct crimson border highlight (`border-left: 3px solid var(--status-critical)`) and a red warning chip.
- Related redesign file: `docs/design/pages/events.md`

### DF-054 Missing empty state guidance when filters match zero events
- Route(s): `/events`
- Category / Severity / Impact / Effort: STATE / S3 / 3 / XS
- What is wrong: When an active filter returns no matching events, the screen renders an empty blank canvas with a plain string "No events found" without a "Clear all filters" shortcut.
- Evidence: `screenshots/events/empty-1440x900-dark.png`, `frontend/src/app/features/events/events.component.html:72`.
- Why it matters: Users must manually remember which filters they clicked to restore view state.
- Recommended fix: Render a stylized empty radar icon with an actionable "Reset Filters" button.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

---

## What Works Well
- Monospace formatting on container IDs and exit codes supports precise technical debugging.
- Event category pills (Container, Image, Volume, Network) allow quick scope filtering.
- Visual pulse dot in the header communicates live SSE socket health.

---

## Top 3 Improvements
1. Implement a feed pause/buffer toggle to prevent timeline jumps during active incident streams.
2. Elevate OOM and exit-code crashes with prominent critical accent styling.
3. Fix timestamp text contrast to meet WCAG AA standards.
