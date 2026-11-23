# Page: Compose Projects & Topology (/projects)

## Purpose
Governs docker-compose project cards, service health strips, and the interactive drag-and-zoom Topology node graph of services and interconnected container networks.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/07-quality-gates.md

## Requirements

### Route Path & Metadata
- **Route path**: `/projects`
- **Data used**: Compose projects list (project name, working directory, status), service array per project (service name, container IDs, state, replicas), network associations and IP bindings.

### Project Cards Overview
- Rendered as interactive glass cards (`GlassPanel`):
  - Project name, path, and aggregate operational state.
  - Mini status strip showing each child service as a micro-indicator coloured by state (`#34D399` running, `#F59E0B` warning, `#F43F5E` critical, `#6B6980` stopped).
  - Quick action controls: Up, Down, Restart, View Logs.
  - Destructive project operations trigger hold-to-confirm dialog (`ConfirmDangerDialog`).

### Topology View: Interactive Node Graph
- Project detail view includes an interactive **Topology View**:
  - Interactive node graph (implemented in SVG or HTML5 Canvas with drag and zoom capabilities).
  - Visualizes services as nodes and network bridges as connecting lines with glowing packet flow indicators.
  - **Constraint on network data**: Must use ONLY data the API already provides; if network data is not available, skip it and report back.
  - **Performance requirement**: Lazy-load the topology view module; pause rendering when out of viewport.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Project cards and topology canvas enclosure.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Service mini-strip status indicators.
- [ConfirmDangerDialog](file:///docs/design/spec/04-components.md#9-confirmdangerdialog) - Project teardown and down commands.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Project card loading states.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Zero-project placeholder.

### Designed States
- **Loading state**: Project cards shimmer with `SkeletonShimmer`; topology graph renders faint pulsing node placeholders.
- **Empty state**: Clean line art showing `"NO COMPOSE FLEETS DISCOVERED"` with instructions for compose discovery.
- **Error state**: Project command failure displays actionable toast and card retry button.
- **Offline state**: Top banner denotes offline status; destructive project commands are protected.

## Acceptance criteria
- [ ] Compose projects render with mini status strips reflecting child service health.
- [ ] Topology view provides fluid pan and zoom for project services and networks.
- [ ] Topology view is strictly lazy-loaded per the performance budget.
- [ ] If network data is missing from the existing API, graph renders service nodes only and logs the absence without breaking.

## Must not
- Do NOT modify compose backend execution services or audit logging.
- Do NOT bundle the topology canvas engine into the initial page bundle (must lazy load).
- Do NOT invent fake network endpoints if backend API does not provide network bindings.
- Do NOT cause dropped frames during graph drag and pan operations.
