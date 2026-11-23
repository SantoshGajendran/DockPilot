# Page: Logs Explorer (/logs)

## Purpose
Governs the high-throughput log console, virtual scrolling pipeline, level-colored gutter bars, JSON formatting drawer, inline regex highlights, stream pause pill, and scrollbar error density minimap.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/logs`
- **Data used**: Live log lines via SSE/WebSocket: timestamp, container ID, container name, stream (`stdout` / `stderr`), message string, parsed log level (`DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`).

### Premium Log Viewer Console
- Virtual scroll architecture capable of handling thousands of lines without DOM thrashing or frame drops.
- Entire console styled with `JetBrains Mono` and obsidian background (`--bg-0 #060609`).
- **Level-coloured gutter bar**: Thin 2px vertical gutter indicator per row matching status colors:
  - Error/Fatal: `#F43F5E`
  - Warn: `#F59E0B`
  - Info: `--violet` (`#8B5CF6`)
  - Debug/Trace: `--text-mute` (`#6B6980`)
- **JSON auto-prettify**: Clicking any log line containing JSON automatically expands and formats it in-place into an indented syntax-highlighted block.
- **In-line regex highlight**: Instant search bar highlighting matching regex tokens in real-time in brand gold (`--gold`).
- **Stream control & pause pill**: Pause/Resume toggle; when paused during active streaming, a floating pill displays `"N new lines"` above the console; clicking resumes and auto-scrolls to bottom.
- **Error density minimap**: A vertical visual minimap along the custom scrollbar track rendering tick marks coloured by severity to pinpoint error clusters.
- **Multi-container merged view**: Ability to stream logs from multiple selected containers simultaneously, with colour-coded source tag chips identifying each container.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Log console enclosure and filter controls bar.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Live connection indicator and container chips.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Initial console loading lines.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Zero log output state.

### Designed States
- **Loading state**: Monospace shimmer lines pulse in the terminal window while connecting to stream.
- **Empty state**: Clean empty screen with line art denoting `"QUIET STREAM // NO LOG MESSAGES RECEIVED"`.
- **Error state**: SSE connection drop renders a persistent reconnection banner with manual reconnect action.
- **Offline state**: Top banner denotes offline state; log streaming pauses automatically.

## Acceptance criteria
- [ ] Virtual scroll maintains 60fps scrolling under continuous incoming log streams.
- [ ] Level-coloured gutters render alongside every line according to log severity.
- [ ] Clicking JSON log lines auto-expands formatted JSON syntax in-line.
- [ ] Regex search input dynamically highlights matching terms in brand gold.
- [ ] Pausing the stream halts auto-scroll and surfaces `"N new lines"` floating pill.
- [ ] Minimap along scrollbar renders visual density markers for warnings and errors.
- [ ] Multi-container view prepends distinct color-coded container tags.

## Must not
- Do NOT render unbounded DOM elements causing browser memory bloat or tab crashes.
- Do NOT use non-monospace fonts in log rows or JSON inspectors.
- Do NOT allow auto-scroll to snap the view when the user has scrolled up to inspect previous lines.
