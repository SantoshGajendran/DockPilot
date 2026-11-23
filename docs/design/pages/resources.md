# Page: Resources - Images, Volumes & Networks (/resources)

## Purpose
Governs secondary Docker resources (images, persistent volumes, and bridge networks), structured as tabbed gallery cards with visual size bars and hold-to-confirm pruning actions.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/resources`
- **Data used**: Docker resource registries:
  - Images: image ID, repository tags, virtual size, created date, container count using image.
  - Volumes: volume name, driver, mountpoint, size on disk, active container attachments.
  - Networks: network ID, name, driver (`bridge`, `host`, `overlay`), subnet, connected containers.

### Tabbed Gallery Cards & Size Bars
- Tabbed interface switching between Images, Volumes, and Networks.
- Rendered as responsive gallery cards (`GlassPanel`):
  - Repository / Volume name in Space Grotesk.
  - IDs and sizes in `JetBrains Mono` with `tabular-nums`.
  - **Size bars**: Horizontal segmented or proportional size bars indicating disk footprint relative to total disk allocation.
  - In-use indicator chip (green status dot for attached resources, muted for dangling/unused).

### Hold-to-Confirm Pruning Action
- Global and per-item Prune actions (Prune Dangling Images, Prune Unused Volumes, Prune Networks).
- Prune operations strictly utilize the `ConfirmDangerDialog` component:
  - User must press and hold for 1.2s while circular indicator fills.
  - Prominently displays the total reclaimed disk space potential.
  - Re-skins the two-phase confirmation token flow without modifying underlying backend APIs.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Resource gallery cards and prune headers.
- [ConfirmDangerDialog](file:///docs/design/spec/04-components.md#9-confirmdangerdialog) - System prune operations.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Attachment status indicators.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Gallery card loading states.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Zero-resource views.

### Designed States
- **Loading state**: Gallery card grid displays `SkeletonShimmer` tiles with placeholder size bars.
- **Empty state**: Clean vector line art denoting `"STORAGE BAY EMPTY // ZERO DANGLING RESOURCES"`.
- **Error state**: Resource query failure surfaces card-level error with retry button.
- **Offline state**: Top banner denotes offline state; prune actions disabled.

## Acceptance criteria
- [ ] Images, volumes, and networks organized into tabbed gallery views.
- [ ] Cards display visual size bars proportional to disk consumption.
- [ ] Prune action enforces 1.2s hold-to-confirm interaction via `ConfirmDangerDialog`.
- [ ] Monospace numerals used for all byte sizes, IDs, and hashes.

## Must not
- Do NOT execute prune actions on simple single-clicks (must require 1.2s hold).
- Do NOT modify prune API endpoints, confirmation tokens, or audit records.
- Do NOT use standard flat HTML tables instead of styled gallery cards.
