# Page: Audit Log (/audit)

## Purpose
Governs the operational audit ledger, featuring time-ordered monospace records, subtle border dividers, operational status chips, and a slide-out drawer for inspecting JSON payloads.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/audit`
- **Data used**: Audit log database records: record ID, timestamp, operator/user identity, target entity (`container`, `project`, `volume`, `system`), action type, execution status (`pending`, `success`, `failure`), client IP address, JSON payload details, response status.

### Time-Ordered Ledger Presentation
- High-density flight ledger aesthetic:
  - Rendered predominantly in `JetBrains Mono` with tight vertical spacing.
  - Subtle row dividers (`--line-soft rgba(255,255,255,.05)`).
  - Monospace timestamps with `tabular-nums`.
  - Operator identity displayed as a compact tag chip.
- **Status Chips**:
  - `pending`: Amber outline (`#F59E0B`) with slow pulse.
  - `success`: Crisp green chip (`#34D399`).
  - `failure`: Rose chip (`#F43F5E`) with error glyph.

### Expandable Slide-Out Payload Drawer
- Clicking any audit log row opens a detailed inspection drawer that smoothly slides in from the right viewport edge (`220ms` duration, `--ease-out`).
- Displays formatted, syntax-highlighted request and response JSON payloads.
- Includes a one-click "Copy JSON" action with toast feedback.
- Pressing `Escape` or clicking backdrop smoothly dismisses the drawer.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Ledger container and slide-out payload drawer.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Execution state indicators.
- [Toast](file:///docs/design/spec/04-components.md#10-toast) - Copy-to-clipboard notifications.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Ledger rows loading state.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Empty ledger state.

### Designed States
- **Loading state**: Monospace ledger rows display `SkeletonShimmer` bars across columns.
- **Empty state**: Clean line art denoting `"FLIGHT LEDGER CLEAR // ZERO DISPATCH EVENTS RECORDED"`.
- **Error state**: Database retrieval error surfaces a retry action banner.
- **Offline state**: Top banner denotes offline state; audit log is read-only.

## Acceptance criteria
- [ ] Ledger renders in monospace font with subtle row dividers and high density.
- [ ] Status chips render distinct colors for pending, success, and failure states.
- [ ] Clicking a record triggers a slide-out drawer from the right containing formatted JSON payload.
- [ ] Keyboard navigation and `Escape` key close the payload drawer.

## Must not
- Do NOT alter audit database tables, interceptors, or logging pipelines.
- Do NOT use standard Material expansion panels or default tables.
- Do NOT wrap long JSON payloads into unreadable, unformatted strings.
