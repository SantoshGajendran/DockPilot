# Page: Dashboard / Command Deck (/dashboard)

## Purpose
Governs the primary operations overview page ("Command Deck"), featuring the central orbital container visualization hero, unequal bento grid metrics layout, and live telemetry stream animations.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/05-dataviz.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/dashboard`
- **Data used**: Host telemetry (CPU, memory, disk usage), container resource consumption (CPU %, memory bytes, status), active alerts feed, recent events timeline, network and disk I/O time series, container state counts (running, stopped, restarting).

### Session Boot Sequence
- First load of the dashboard per session: a short (under 1.2s, skippable) "systems online" boot sequence where panels power on in order.

### Hero Section: Orbital Visualization
- **Metaphor & Layout**: An orbital visualization representing the flight deck core:
  - Host core positioned in the center as concentric rings (CPU, memory, disk).
  - Containers rendered as orbital nodes orbiting around the host core.
  - Orbital distance from center scaled inversely/proportionately by resource consumption.
  - Orbiting nodes status-coloured (`#34D399` running, `#F59E0B` warning, `#F43F5E` critical, `#6B6980` stopped).
- **Interactivity**:
  - Hover on container node displays floating preview stats card.
  - Click on container node immediately navigates to container detail (`/containers/:id`).

### Bento Grid Layout (Below Hero)
- Structured with unequal tile sizes (no two adjacent tiles may look identical):
  1. Live host load chart (using `ChartTheme`).
  2. Top resource consumers list.
  3. Active alerts feed with severity edge light.
  4. Recent events timeline with animated entries.
  5. Container state breakdown donut chart.
  6. Network and disk I/O sparklines (`Sparkline`).

### Live Telemetry Streaming Dynamics
- Live updates must feel alive (driven by 2-second SSE telemetry updates):
  - Numbers tween smoothly using `MetricNumber` and spring easing (`--spring`).
  - Sparklines slide coordinates horizontally without canvas flicker.
  - New events slide in smoothly from the top of the feed (`120 / 220ms`).
  - No layout shift from live updates (zero CLS).

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Bento grid tile enclosures.
- [MetricNumber](file:///docs/design/spec/04-components.md#2-metricnumber) - Core host telemetry figures.
- [Sparkline](file:///docs/design/spec/04-components.md#3-sparkline) - Network & disk I/O activity.
- [RadialGauge](file:///docs/design/spec/04-components.md#4-radialgauge) - Host core capacity rings.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Container state status indicators.
- [HeatTile](file:///docs/design/spec/04-components.md#6-heattile-grid) - Quick container status cluster.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Bento tile loading skeletons.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Clear panels when no alerts or events exist.

### Designed States
- **Loading state**: Bento tiles render `SkeletonShimmer` matched to the exact tile geometry while initial telemetry streams connect.
- **Empty state**: Clean empty cards with line art for empty alerts and event streams ("PANEL CLEAR // ZERO ANOMALIES DETECTED").
- **Error state**: Bento card displays retry button if specific telemetry feeds fail.
- **Offline state**: Top banner indicates SSE backoff and reconnection countdown while retaining last known values.

## Acceptance criteria
- [ ] First load executes <1.2s skippable "systems online" panel illumination sequence.
- [ ] Central orbital visualization renders host core rings and orbiting container nodes at resource-scaled distances.
- [ ] Hovering orbiting nodes shows preview telemetry; clicking navigates to container detail.
- [ ] Bento grid features varied, non-identical adjacent card geometries.
- [ ] Incoming SSE updates animate via spring tweening on numerals and coordinate shifting on sparklines without layout shifts.
- [ ] 60fps frame rate maintained during continuous 2-second SSE updates.

## Must not
- Do NOT use identical equal-sized card grids.
- Do NOT use generic white cards or default Material surfaces.
- Do NOT redraw charts from scratch causing visual flicker on SSE ticks.
- Do NOT allow digits to jitter on updates (must enforce `tabular-nums`).
- Do NOT let live telemetry updates produce Cumulative Layout Shift (CLS).
