# DockPilot UI Redesign: Open Questions & Architectural Clarifications

This document tracks items from `docs/design/MASTER_PROMPT.md` that are ambiguous, conditional, or require implementation decisions during development. In accordance with project constraints, no design decisions were invented.

---

## 1. Compose Topology Network Data Availability
- **Master Prompt Reference**: Line 64 (`/projects`)
- **Master Prompt Text**: *"interactive node graph (SVG or canvas, drag and zoom) of services and networks using only data the API already provides; if network data is not available, skip it and tell me."*
- **Context & Issue**:
  - The master prompt explicitly notes that network connectivity information may not be present in the existing Compose projects API endpoint (`/api/projects`).
- **Resolution Strategy for Phase 5**:
  - During Phase 5 execution, inspect the backend response payload from `/api/projects`.
  - If service-to-network bridge mappings are included, render both service nodes and network bridge nodes.
  - If network data is missing or incomplete, render only service dependency nodes and surface a note in the phase completion report. Do NOT alter backend models or add mock network APIs.

---

## 2. Dev-Only Demo Route vs Storybook Architecture
- **Master Prompt Reference**: Line 87 (Phase 3)
- **Master Prompt Text**: *"Shared signature components and Storybook-style demo route (dev-only) to review them."*
- **Context & Issue**:
  - DockPilot currently does not have a Storybook toolchain installed in `frontend/`.
  - Adding Storybook would introduce significant external dependencies and configuration overhead.
- **Resolution Strategy for Phase 3**:
  - Implement a dedicated Angular standalone component route (`/dev/components`) guarded by `isDevMode()` in development builds.
  - Exclude `/dev` from production builds (`ng build --configuration production`).
  - This provides an isolated visual audit sandbox matching the "Storybook-style demo route" requirement without adding external dependencies.

---

## 3. Orbital Visualization Engine Selection (SVG vs Canvas)
- **Master Prompt Reference**: Line 60 (`/dashboard`)
- **Master Prompt Text**: *"Hero = an orbital visualization: host core in the centre as concentric rings (CPU, memory, disk) with containers as nodes orbiting at distances scaled by resource use, status-coloured, hover to preview stats, click to open."*
- **Context & Issue**:
  - The master prompt does not mandate whether the orbital hero must be rendered via SVG or HTML5 Canvas.
  - SVG provides native DOM hover events, tooltip alignment, and CSS animation synchronization.
  - HTML5 Canvas may offer lower memory footprint for systems with very high container counts (50+ containers).
- **Resolution Strategy for Phase 4**:
  - Benchmark SVG implementation during Phase 4 against the 60fps requirement under live 2-second SSE updates. If container counts cause frame drops below 60fps, switch to a 2D Canvas approach with rAF batching.

---

## 4. Exact Numerical Thresholds for `MetricNumber` & `RadialGauge`
- **Master Prompt Reference**: Line 47 (`MetricNumber`), Line 49 (`RadialGauge`)
- **Master Prompt Text**: *"colour shifts by threshold, tiny delta arrow"*, *"threshold tick marks"*.
- **Context & Issue**:
  - Master prompt specifies that numerals and gauges shift colors across running, warning, and critical states, but does not provide exact numeric boundary defaults.
- **Resolution Strategy for Phase 1 & Phase 3**:
  - Use standard server monitoring threshold conventions unless configured via backend settings:
    - Normal / Healthy (`#34D399`): `< 75%` utilization
    - Warning (`#F59E0B`): `75% - 89.9%` utilization
    - Critical (`#F43F5E`): `>= 90%` utilization
  - Ensure threshold values are configurable via constants rather than hardcoded in template markup.

---

## 5. Source Location Directory Typo
- **Master Prompt Reference**: Repository structure
- **Context & Issue**:
  - The master prompt was originally found in `docs/desgin/MASTER_PROMPT.md` with a typographical error in the directory name (`desgin` instead of `design`).
- **Resolution**:
  - Created canonical directory `docs/design/` and copied `MASTER_PROMPT.md` untouched into `docs/design/MASTER_PROMPT.md`.
