# Page: Events Timeline (/events)

## Purpose
Governs the temporal event stream, vertical timeline layout with animated connecting lines, and specialized warning iconography and glowing highlights for critical container crash and OOM occurrences.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/events`
- **Data used**: Docker daemon event feed: timestamp, container ID, container name, event action (`die`, `start`, `kill`, `oom`, `restart`, `health_status`), exit codes, event severity.

### Vertical Timeline Architecture
- Central or left-aligned vertical timeline rail.
- **Animated connectors**: Glowing connecting vertical lines between timeline event nodes that animate downwards as new events are appended from the live stream.
- Event entries formatted as cards (`GlassPanel`) attached to the timeline track.

### Critical Event Highlighting & Iconography
- Distinct iconography and subtle outer glow applied to catastrophic event types:
  - **OOM (Out Of Memory)**: Memory chip icon with red flare and subtle outer glow (`#F43F5E`).
  - **Crash / Unclean Die**: Warning diamond icon with exit code pill and red edge glow.
  - **Restart-Loop**: Rotating spiral icon with warning amber glow (`#F59E0B`).
- Standard events (start, pause, normal stop) use restrained muted iconography and `--line` borders.

### Filtering & Search
- Quick filters by event type (`All`, `Crashes`, `State Changes`, `Health`).
- Monospace timestamp format (`JetBrains Mono`, `tabular-nums`) with relative time tooltip.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Timeline event cards.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Timeline node markers.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Timeline loading placeholders.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Empty timeline view.

### Designed States
- **Loading state**: Timeline nodes and connector track pulse with `SkeletonShimmer`.
- **Empty state**: Line art graphic denoting `"TIMELINE CLEAR // ZERO SYSTEM ANOMALIES RECORDED"`.
- **Error state**: Stream connection error banner with retry button.
- **Offline state**: Top banner indicates offline timeline; live event subscription pauses.

## Acceptance criteria
- [ ] Timeline renders as a vertical track with custom animated connectors between nodes.
- [ ] OOM, crash, and restart-loop events feature dedicated icons and subtle glowing highlights.
- [ ] Incoming events slide in from the top without layout shift or frame stutter.
- [ ] Timestamps formatted in JetBrains Mono with tabular figures.

## Must not
- Do NOT use standard Material Stepper components.
- Do NOT use generic emoji as event icons.
- Do NOT cause the timeline to jump abruptly when new events arrive.
