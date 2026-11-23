# Page: Container Detail (/containers/:id)

## Purpose
Governs the deep container inspection view, morphing shared-element header, prominent radial telemetry gauges, sliding tab navigation, and the retro-futuristic bezel-framed web terminal.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/05-dataviz.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/containers/:id`
- **Data used**: Container inspection payload (config, state, network settings, mounts, environment variables), real-time telemetry stream (CPU %, memory bytes/limit, network Rx/Tx, block I/O), live logs SSE stream, interactive WebSocket terminal session, container event records.

### Glass Header & Morphing Shared-Element
- Glass header (`GlassPanel`) receiving the shared-element transition from `/containers`:
  - Title and status dot morph cleanly into the detail header.
- Displays container name, ID chip (truncated monospace), image tag, uptime counter, and primary action buttons (Restart, Stop, Kill).
- Destructive actions trigger hold-to-confirm dialog (`ConfirmDangerDialog`).

### Telemetry Instrument Cluster: Big Radial Gauges
- Displays prominent large radial gauges (`RadialGauge`):
  - CPU utilization gauge with glowing arc head and limit ticks.
  - Memory utilization gauge with threshold indicators.
- Accompanied by large numerals (`MetricNumber`) with spring tweening and tabular figures.

### Tabbed Body with Sliding Underline
- Tabbed navigation sections:
  1. **Overview**: Key-value telemetry grid, ports, environment variables, mounts.
  2. **Logs**: Embedded log stream with level coloring.
  3. **Terminal**: Interactive web terminal.
  4. **Inspect**: Formatted, searchable JSON inspection tree.
  5. **Events**: Filtered historical timeline for this container.
- Active tab features a gold sliding underline indicator (`--gold #D4AF37`, smooth easing `--ease-out`, `220ms`).

### Web Terminal Panel (xterm.js in Bezel Container)
- Terminal sits in a bezel-like panel (`GlassPanel` with machined inner bevel).
- Very subtle scanline overlay and soft cathode-ray outer glow.
- Font: strictly `JetBrains Mono`.
- Integrated terminal header:
  - Connection state indicator (green dot for connected, amber for reconnecting).
  - Live session duration timer (`tabular-nums`).
  - Terminal clear and fullscreen buttons.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Detail header and terminal bezel enclosure.
- [RadialGauge](file:///docs/design/spec/04-components.md#4-radialgauge) - Prominent CPU and memory gauges.
- [MetricNumber](file:///docs/design/spec/04-components.md#2-metricnumber) - Real-time resource figures.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Header status indicator.
- [ConfirmDangerDialog](file:///docs/design/spec/04-components.md#9-confirmdangerdialog) - Container stop, kill, and remove operations.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Header and gauge loading skeletons.

### Designed States
- **Loading state**: Gauges render glowing skeleton arcs while inspection payload resolves.
- **Empty state**: Empty state line art for empty logs or event streams.
- **Error state**: Unreachable container or disconnected terminal displays clear retry trigger.
- **Offline state**: Top banner indicates disconnected SSE/WebSocket feeds; terminal displays reconnecting pill.

## Acceptance criteria
- [ ] Shared-element transition animates title and status dot from container list row into header.
- [ ] Large radial gauges render glowing arc heads and update smoothly without layout shifts.
- [ ] Tab navigation features a smoothly sliding gold underline indicator without jump cuts.
- [ ] Terminal panel renders bezel styling, subtle scanline overlay, and `JetBrains Mono` text.
- [ ] Terminal header reflects live connection state and session timer.

## Must not
- Do NOT alter WebSocket terminal protocols, multiplexers, or backend Docker exec logic.
- Do NOT use standard Material tabs with default ink bar animations.
- Do NOT allow terminal fonts to fall back to non-monospace fonts.
- Do NOT introduce layout thrashing when tabs switch or live metrics update.
