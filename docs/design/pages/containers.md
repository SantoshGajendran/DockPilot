# Page: Containers List (/containers)

## Purpose
Governs the container management inventory table, dense monospace telemetry display, inline sparklines, hover quick actions, floating bulk-action bar, saved filters, and transition handoff to container detail.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/containers`
- **Data used**: Container inventory array: container ID, name, image tag, status (`running`, `stopped`, `restarting`), uptime, CPU usage percentage time-series, memory usage time-series, exposed/bound ports, docker-compose project association.

### Dense Telemetry Table Layout
- Dense but beautiful tabular interface:
  - **Columns per row**:
    1. Selection checkbox (custom styled, no default Material checkbox).
    2. Status dot (`StatusDot`).
    3. Container name (Space Grotesk, semi-bold).
    4. Image tag (JetBrains Mono, truncated with tooltip).
    5. Uptime (JetBrains Mono, `tabular-nums`).
    6. CPU utilization with inline miniature sparkline (`Sparkline`).
    7. Memory utilization with inline miniature sparkline (`Sparkline`).
    8. Bound ports formatted as monospace chips.
- **Row Hover Dynamics**:
  - Hovering a row lights up its inline sparklines (heightened glow in `--violet-hi`).
  - Quick action controls (restart, stop, open logs, open terminal) smoothly fade into view on row hover (`120ms`).

### Multi-Select & Floating Bulk Action Bar
- Multi-selecting one or more rows reveals a floating bulk-action bar anchored at the bottom-center of the viewport.
- Actions: Bulk Start, Bulk Stop, Bulk Restart, Bulk Prune.
- Destructive actions trigger hold-to-confirm interaction (`ConfirmDangerDialog`).

### Filtering & Search Controls
- Saved filter chips (Running, Stopped, Alerting, System).
- Instant search with keyboard-first filtering.
- Group-by toggle to organize rows by Compose project hierarchy.

### Shared-Element View Transition
- Clicking a container row initiates a shared-element view transition to `/containers/:id`:
  - The row's name text and status dot morph seamlessly into the detail view header.

### Signature Components Used
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Row status indicators.
- [Sparkline](file:///docs/design/spec/04-components.md#3-sparkline) - Inline CPU and memory historical indicators.
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Floating bulk-action bar and table container.
- [ConfirmDangerDialog](file:///docs/design/spec/04-components.md#9-confirmdangerdialog) - Bulk stop/prune operations.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Tabular loading rows.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Zero-container state.

### Designed States
- **Loading state**: Table displays 8–10 rows of `SkeletonShimmer` with placeholder columns and sparkline outlines.
- **Empty state**: Displays line-art graphic with `"NO ACTIVE CRAFT DETECTED"` and a primary `"DEPLOY CONTAINER"` action.
- **Error state**: Displays an error message with a `"RECONNECT TELEMETRY"` retry button.
- **Offline state**: Sticky banner denotes offline mode; controls requiring backend dispatch are safely disabled.

## Acceptance criteria
- [ ] Table renders densely with custom borders (`--line rgba(255,255,255,.09)`) and no default Material styling.
- [ ] Inline CPU and memory sparklines draw cleanly and light up brighter on row hover.
- [ ] Quick actions fade in smoothly on row hover.
- [ ] Multi-select triggers floating bottom bulk-action bar.
- [ ] Shared-element transition animates container name and status dot into `/containers/:id` header.
- [ ] Compose grouping toggle clusters rows by project.

## Must not
- Do NOT use standard Material table styling or pagination bars.
- Do NOT modify container start, stop, or restart API calls or audit records.
- Do NOT cause table row jitter when CPU or memory percentages update.
- Do NOT omit visible focus indicators during keyboard row selection.
