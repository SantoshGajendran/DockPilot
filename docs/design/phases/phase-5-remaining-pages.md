# Phase 5: Host, Logs, Events, Alerts, Projects & Resources

## Objective
Redesign the remaining operational pages: the physical host server instrument cluster (`/host`), the high-throughput virtualized logs explorer (`/logs`), the vertical events timeline (`/events`), the active alerts panel and rule toggles (`/alerts`), compose projects and interactive topology graph (`/projects`), and resource galleries with hold-to-confirm pruning (`/resources`).

## Read first
- .agents/rules/design-guardrails.md
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/05-dataviz.md
- docs/design/spec/06-states-microcopy.md
- docs/design/spec/07-quality-gates.md
- docs/design/pages/host.md
- docs/design/pages/logs.md
- docs/design/pages/events.md
- docs/design/pages/alerts.md
- docs/design/pages/projects.md
- docs/design/pages/resources.md

## Scope
### In Scope
- `/host`: Instrument cluster with large radial gauges, per-core CPU bars with ripple effect, stacked segmented disk bars, three-needle load average dial, ticking monospace uptime counter.
- `/logs`: Virtual scrolling console, level-colored gutter bars, JSON auto-prettify on click, inline regex highlight, pause/resume toggle with floating `"N new lines"` pill, scrollbar error density minimap, multi-container merged view.
- `/events`: Vertical timeline with animated connectors; distinct icons and subtle glowing highlights for OOM, crash, and restart-loop events.
- `/alerts`: Active alerts as edge-lit panels (`#F43F5E` critical, `#F59E0B` warning), rules list with custom animated toggle switches, channels with inline "test send" delivery feedback.
- `/projects`: Compose project cards with service status strips; project detail interactive Topology graph (SVG/canvas, pan/zoom, lazy-loaded; skip network if not in API and report).
- `/resources`: Tabbed gallery cards for images, volumes, and networks with proportional size bars; hold-to-confirm prune interaction (`ConfirmDangerDialog`).
- Designed skeleton, empty, error (with retry), and offline states across all six routes.

### Out of Scope
- Audit log, user management, profile, and settings forms -> Phase 6.

## Steps
1. Redesign `/host` per `pages/host.md`. Assemble the instrument cluster layout with `RadialGauge` dials, rippling per-core CPU bars, segmented disk bars, three-needle load dial, and ticking uptime clock.
2. Redesign `/logs` per `pages/logs.md`. Implement virtual scrolling, severity gutters, in-line JSON expansion, regex highlights, stream pause pill, and scrollbar minimap.
3. Redesign `/events` per `pages/events.md`. Build vertical timeline track with animated connectors and specialized icons/glow for OOM, crash, and restart loops.
4. Redesign `/alerts` per `pages/alerts.md`. Add severity edge lighting to active alerts, custom animated toggle switches to rule rows, and inline delivery status to channel test-send buttons.
5. Redesign `/projects` per `pages/projects.md`. Build project cards with service mini strips. Build lazy-loaded Topology node graph with pan/zoom controls using existing API data.
6. Redesign `/resources` per `pages/resources.md`. Implement gallery cards with size bars; wire prune operations to `ConfirmDangerDialog` (1.2s hold).
7. Apply operator-style microcopy and verify skeleton/empty/error states across all six pages.

## Verification
- Run `npm test` and `ng build`.
- Inspect `/host`: verify per-core ripple effect and three-needle load dial.
- Inspect `/logs`: test streaming performance, JSON auto-formatting, and `"N new lines"` pause pill.
- Inspect `/events`: verify OOM and crash event icons and glowing borders.
- Inspect `/alerts`: test custom animated toggle switches and inline test-dispatch status.
- Inspect `/projects`: verify Topology graph is lazy-loaded and supports pan/zoom.
- Inspect `/resources`: verify hold-to-confirm pruning requires 1.2s press.
- Capture screenshots at 1280px and 390px across all six views.

## Report back
- Summary of page implementations.
- Desktop and mobile screenshots for `/host`, `/logs`, `/events`, `/alerts`, `/projects`, and `/resources`.
- Confirmation of lazy-loading verification for the topology module.
- Any open questions or deviations.

## Stop
Stop here. Do NOT proceed to Phase 6 until this phase report has been reviewed and approved.
