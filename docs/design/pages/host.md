# Page: Host Server (/host)

## Purpose
Governs the physical host server telemetry dashboard, presenting a high-density "flight deck" instrument cluster with per-core CPU rippling bars, radial gauges, segmented disk bars, three-needle load dials, and ticking uptime.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/05-dataviz.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/host`
- **Data used**: Host hardware & OS metrics: total CPU %, per-core CPU % array, memory utilization breakdown (used, free, buffers, cached), swap usage, disk partitions capacity and I/O, system load averages (1m, 5m, 15m), system uptime, Docker daemon metadata.

### Instrument-Cluster Layout
- High-density physical instrumentation arrangement:
  1. **Large Radial Gauges**: Primary gauges for overall CPU load and system RAM utilization (`RadialGauge`), with threshold indicators and glowing arc heads.
  2. **Per-Core CPU Ripple Bars**: Multi-core breakdown with animated vertical or horizontal bars representing individual cores that ripple on telemetry update intervals.
  3. **Stacked Segmented Disk Bars**: Disk storage partitions rendered as segmented dark-metal progress bars with distinct color segments for system, Docker storage, and free space.
  4. **Three-Needle Load Average Dial**: Custom circular or semi-circular dial featuring 3 distinct needles representing 1-minute (`--violet-hi`), 5-minute (`--gold`), and 15-minute (`--text-dim`) load averages.
  5. **Ticking Uptime Counter**: Large monospace display (`JetBrains Mono`, `tabular-nums`) incrementing continuously second-by-second like a mission elapsed time clock.

### Signature Components Used
- [RadialGauge](file:///docs/design/spec/04-components.md#4-radialgauge) - Main CPU and memory dials.
- [MetricNumber](file:///docs/design/spec/04-components.md#2-metricnumber) - Numerical load indicators.
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Instrument cluster enclosures with inner highlights.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Gauges and ripple bar loading states.

### Designed States
- **Loading state**: Outlines of radial dials and segmented bars pulse with `SkeletonShimmer`.
- **Empty state**: Clean empty states for optional sensors or auxiliary mount devices.
- **Error state**: Host connection failure displays prominent `"CORE DISCONNECTED"` banner with retry action.
- **Offline state**: Top status banner denotes offline telemetry; counters pause tick animation.

## Acceptance criteria
- [ ] Instrument cluster renders large radial gauges with glowing heads for overall host metrics.
- [ ] Per-core CPU bars update with staggered ripple animations on SSE ticks.
- [ ] Disk partitions rendered as stacked segmented bars with clear color separation.
- [ ] Three-needle dial renders distinct 1m, 5m, and 15m load indicators.
- [ ] Uptime counter continuously ticks with monospace tabular figures.

## Must not
- Do NOT use standard flat progress bars or plain HTML progress tags.
- Do NOT drop below 60fps when per-core CPU bars update.
- Do NOT hard-code core count or drive configurations.
- Do NOT allow digits to jitter on the uptime counter.
