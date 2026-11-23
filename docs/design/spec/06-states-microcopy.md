# States & Microcopy: Loading, Empty, Error, Offline & Tone

## Purpose
Governs designed application states (skeleton loading, line-art empty states, actionable error recovery, offline reconnecting banner) and the mission-control operator voice and microcopy guidelines.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/04-components.md

## Requirements

### Required View States
Every view across all 14 routes must explicitly provide 4 designed states:

#### 1. Loading State (Skeleton)
- Implemented with `SkeletonShimmer`.
- Geometry precisely shaped like the real content cards, data tables, metrics, and gauges being fetched.
- Smooth shimmering gradient animation across `--bg-2` / `--bg-3` surfaces.
- Never use generic centering spinners.

#### 2. Empty State
- Implemented with `EmptyState` component.
- Illustrated with clean, simple vector line art matching the 1.5px stroke icon aesthetic.
- Accompanied by a clear, prominent next action (e.g. "Deploy Container", "Create Rule", "View Documentation").
- Never a bare "No data" or blank container.

#### 3. Error State (with Retry)
- Clearly indicates failure mode with operator clarity.
- Prominent retry button triggering immediate re-fetch.
- Preserves layout stability without collapsing view containers.

#### 4. Offline / Reconnecting State
- A slim top banner across the interface.
- Features a pulsing status indicator while SSE connection backs off and attempts reconnection.
- Displays connection latency or retry countdown without obstructing primary navigation.

### Microcopy & Voice Tone
- **Operator Language**: Replace generic web/admin copy with short, confident, operator-style language.
- Examples:
  - Instead of "Failed to load containers": `"TELEMETRY FEED LOST // ATTEMPTING RECONNECT"`
  - Instead of "Are you sure you want to stop this container?": `"CONFIRM ENGINE SHUTDOWN // HOLD TO DISENGAGE"`
  - Instead of "No alerts found": `"PANEL CLEAR // ZERO ANOMALIES DETECTED"`
  - Instead of "Loading stats...": `"INTERROGATING HOST CORE..."`
- All micro-labels formatted in uppercase with wide tracking (11px, 0.12em tracking).

## Acceptance criteria
- [ ] Every route implements designed skeleton, empty, error with retry, and offline states.
- [ ] Skeletons mimic the exact dimensions and arrangement of incoming data cards.
- [ ] Empty states feature custom line art and a primary action trigger.
- [ ] Offline reconnecting banner appears globally with pulsing indicator during SSE disconnection.
- [ ] All UI messaging reflects concise, confident flight-deck operator tone.
- [ ] Section micro-labels rendered at 11px uppercase with 0.12em tracking.

## Must not
- Do NOT use bare "No data", "Nothing here", or empty white/grey boxes.
- Do NOT use generic full-page circular loading spinners.
- Do NOT use casual, apologetic, or overly verbose copywriting ("Oops! Something went wrong...").
- Do NOT use stock illustrations or generic clipart.
