# DockPilot "Flight Deck" UI Redesign: Index & Run Guide

This index provides a complete directory of all decomposed specification, page, phase, rule, and workflow files for the DockPilot UI redesign, along with the execution sequence and Antigravity operating protocol.

---

## 1. Master File Catalog

| File Path | Description | Phases Used | Run Order |
| :--- | :--- | :--- | :--- |
| **Governance & Roots** | | | |
| `docs/design/00-INDEX.md` | Master index, file directory, phase dependency map, and Antigravity guide. | All Phases | Reference |
| `docs/design/MASTER_PROMPT.md` | Original untouched "Flight Deck" UI redesign master prompt. | Reference | Untouched |
| `docs/design/OPEN_QUESTIONS.md` | Unresolved ambiguities, API conditions, and architecture questions. | Phases 3, 4, 5 | Reference |
| `docs/design/COVERAGE_REPORT.md` | Verbatim token, section, character count, and value coverage audit. | Audit | Reference |
| `.agents/rules/design-guardrails.md` | Always-on rule: hard constraints, token rules, anti-patterns (<4k chars). | All Phases | Always Active |
| `.agents/workflows/run-design-phase.md` | Interactive workflow to load, execute, and verify redesign phases (<12k chars). | All Phases | On Demand |
| **Specifications (`spec/`)** | | | |
| `docs/design/spec/01-foundations.md` | Metaphor, obsidian/brand tokens, typography scale, font hosting, motion tokens. | All Phases | Phase 1 Pre-req |
| `docs/design/spec/02-atmosphere.md` | Background canvas, grain, vignette, spotlight, router transitions, Quiet Mode. | Phases 1, 2, 4, 6 | Phase 1–2 |
| `docs/design/spec/03-app-shell.md` | Sidebar icon rail, top bar, command palette (`Ctrl+K`), shortcuts overlay (`?`). | Phase 2 | Phase 2 |
| `docs/design/spec/04-components.md` | 10 signature presentation components and standardized button variants. | Phases 3, 4, 5, 6 | Phase 3 |
| `docs/design/spec/05-dataviz.md` | `ChartTheme` helper for Chart.js and obsidian palette theming for `xterm.js`. | Phases 1, 4, 5 | Phase 1, 4–5 |
| `docs/design/spec/06-states-microcopy.md` | Skeletons, empty states, error retry, offline SSE banner, and operator voice. | Phases 3, 4, 5, 6 | Phase 3–6 |
| `docs/design/spec/07-quality-gates.md` | Anti-patterns, performance budget, WCAG AA a11y, responsive standards, DoD. | Phases 1, 7 | All Phases |
| **Page Specifications (`pages/`)** | | | |
| `docs/design/pages/login.md` | `/login`: Full-screen cinematic entry, pointer parallax, TOTP slide-in panel. | Phase 4 | Phase 4 |
| `docs/design/pages/dashboard.md` | `/dashboard`: Orbital container visualization hero, unequal bento grid. | Phase 4 | Phase 4 |
| `docs/design/pages/containers.md` | `/containers`: Dense table, inline sparklines, floating bulk bar, instant search. | Phase 4 | Phase 4 |
| `docs/design/pages/container-detail.md` | `/containers/:id`: Morphing header, big radial gauges, sliding tabs, bezel terminal. | Phase 4 | Phase 4 |
| `docs/design/pages/host.md` | `/host`: Instrument cluster, radial dials, rippling core bars, load dials, uptime. | Phase 5 | Phase 5 |
| `docs/design/pages/projects.md` | `/projects`: Compose cards, service mini status strips, lazy-loaded topology graph. | Phase 5 | Phase 5 |
| `docs/design/pages/logs.md` | `/logs`: Virtual scrolling console, level gutters, prettify, regex highlight, minimap. | Phase 5 | Phase 5 |
| `docs/design/pages/events.md` | `/events`: Vertical timeline, animated connectors, crash/OOM iconography. | Phase 5 | Phase 5 |
| `docs/design/pages/alerts.md` | `/alerts`: Edge-lit alert panels, custom animated rule toggles, test-dispatch UX. | Phase 5 | Phase 5 |
| `docs/design/pages/resources.md` | `/resources`: Gallery cards, size bars, hold-to-confirm pruning (1.2s). | Phase 5 | Phase 5 |
| `docs/design/pages/audit.md` | `/audit`: Monospace ledger, status chips, slide-out JSON payload drawer. | Phase 6 | Phase 6 |
| `docs/design/pages/users-profile-settings.md` | `/users`, `/profile`, `/settings`: Calm glass forms, sticky save bar, Quiet Mode. | Phase 6 | Phase 6 |
| **Runnable Phase Prompts (`phases/`)** | | | |
| `docs/design/phases/phase-1-foundations.md` | Phase 1: Tokens, fonts, global styles, Material overrides, ambient canvas, grain. | Self | Step 1 |
| `docs/design/phases/phase-2-shell.md` | Phase 2: App shell (sidebar, top bar, command palette, transitions). | Self | Step 2 |
| `docs/design/phases/phase-3-components.md` | Phase 3: Shared signature components & dev-only demo gallery route. | Self | Step 3 |
| `docs/design/phases/phase-4-login-dashboard-containers.md` | Phase 4: Core views: Login, Dashboard, Containers list and detail. | Self | Step 4 |
| `docs/design/phases/phase-5-remaining-pages.md` | Phase 5: Host, Logs, Events, Alerts, Projects (+ topology), Resources. | Self | Step 5 |
| `docs/design/phases/phase-6-admin-pages-quiet-mode.md` | Phase 6: Audit ledger, Admin forms, Quiet Mode, reduced-motion pass. | Self | Step 6 |
| `docs/design/phases/phase-7-polish.md` | Phase 7: Timing audit, a11y audit, performance profile, responsive pass, DoD. | Self | Step 7 |

---

## 2. Page-by-Page Direction & Execution Plan

### Recommended Execution Plan (do in order; stop and report after each phase)

```text
Phase 1: Foundations ───► Phase 2: Shell ───► Phase 3: Components
  (Tokens, Fonts, Canvas)     (Sidebar, TopBar, Kbd)    (10 Shared Components)
                                                               │
                                                               ▼
Phase 6: Admin & Quiet ◄── Phase 5: Operations ◄── Phase 4: Core Pages
  (Forms, Audit, QuietMode)   (Host, Logs, Alerts)      (Login, Deck, Containers)
          │
          ▼
Phase 7: Final Polish & DoD Sign-Off
  (Timing, a11y, Performance Profile)
```

---

## 3. How to Use with Antigravity

1. **Activate Planning Mode**:
   Always enter Planning mode before initiating any design phase so the agent discovers and reads all required specifications before proposing file edits.
2. **Execute One Phase at a Time**:
   Run the dedicated phase runner workflow:
   ```text
   /run-design-phase
   ```
   Specify the exact phase number (e.g., `1`). The agent will load `docs/design/phases/phase-N-*.md` and all files listed in its `## Read first` section.
3. **Review Implementation Plan**:
   Review the agent's proposed edits and verify compliance with `.agents/rules/design-guardrails.md`.
4. **Execute & Verify**:
   The agent executes implementation steps, verifies tests and builds (`npm test && ng build`), captures desktop and mobile screenshots, and halts at the `## Stop` instruction.
5. **Git Commit Between Phases**:
   Review the git diff and visual changes. Create an atomic git commit for the completed phase (e.g. `feat(design): implement phase 1 foundations and ambient canvas`) before requesting the next phase.
