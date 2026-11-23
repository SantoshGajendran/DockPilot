# DockPilot UI Redesign: Coverage & Verification Report

This report verifies that every section, heading, design token, concrete value, route, component, anti-pattern, and performance constraint from `docs/design/MASTER_PROMPT.md` has been faithfully transferred without omission or unauthorized alteration into the modular design prompt suite.

---

## 1. Executive Summary

- **Total Source Sections / Headings in Master Prompt**: 14 (100% mapped)
- **Concrete Values / Tokens Verified**: 99 / 99 (100% verbatim coverage)
- **Omissions / Gaps**: 0
- **Unmapped Content**: None
- **Intentional Duplications**: Universal constraints and anti-patterns duplicated into `.agents/rules/design-guardrails.md` and phase "Must not" sections to maintain self-containment.
- **Customization File Budgets**:
  - `.agents/rules/design-guardrails.md`: **2,172 characters** (Budget: < 4,000 characters — **PASSED**)
  - `.agents/workflows/run-design-phase.md`: **3,203 characters** (Budget: < 12,000 characters — **PASSED**)
- **Source Code Integrity**: Zero modifications to application source, config, styles, or tests (`git status` clean).

---

## 2. Section-by-Section Mapping Audit

| Master Prompt Heading | Line Range | Destination File(s) | Status |
| :--- | :--- | :--- | :--- |
| `## ROLE` | L3–5 | `docs/design/00-INDEX.md`, `docs/design/spec/01-foundations.md`, `docs/design/phases/phase-1-foundations.md` | **Mapped** |
| `## HARD CONSTRAINTS (do not violate)` | L6–15 | `.agents/rules/design-guardrails.md`, `docs/design/spec/07-quality-gates.md`, all `phases/*.md` | **Mapped** |
| `## DESIGN CONCEPT` | L16–18 | `docs/design/spec/01-foundations.md`, `docs/design/00-INDEX.md` | **Mapped** |
| `## DESIGN TOKENS` | L19–31 | `docs/design/spec/01-foundations.md`, `.agents/rules/design-guardrails.md`, `docs/design/phases/phase-1-foundations.md` | **Mapped** |
| `## GLOBAL ATMOSPHERE` | L32–38 | `docs/design/spec/02-atmosphere.md`, `docs/design/phases/phase-1-foundations.md`, `docs/design/phases/phase-2-shell.md` | **Mapped** |
| `## APP SHELL` | L39–44 | `docs/design/spec/03-app-shell.md`, `docs/design/phases/phase-2-shell.md` | **Mapped** |
| `## SIGNATURE COMPONENTS` | L45–57 | `docs/design/spec/04-components.md`, `docs/design/phases/phase-3-components.md`, all `pages/*.md` | **Mapped** |
| `## PAGE-BY-PAGE DIRECTION` | L58–71 | `docs/design/00-INDEX.md`, `docs/design/pages/*.md` (12 files), `phases/phase-4`, `phases/phase-5`, `phases/phase-6` | **Mapped** |
| `## DATA-VIZ THEMING` | L72–74 | `docs/design/spec/05-dataviz.md`, `docs/design/phases/phase-1-foundations.md`, `docs/design/pages/dashboard.md` | **Mapped** |
| `## STATES & MICROCOPY` | L75–77 | `docs/design/spec/06-states-microcopy.md`, `docs/design/spec/04-components.md`, all `pages/*.md` | **Mapped** |
| `## ANTI-PATTERNS` | L78–80 | `.agents/rules/design-guardrails.md`, `docs/design/spec/07-quality-gates.md`, all `spec/*.md`, all `pages/*.md` | **Mapped** |
| `## PERFORMANCE BUDGET` | L81–83 | `docs/design/spec/07-quality-gates.md`, `docs/design/phases/phase-7-polish.md` | **Mapped** |
| `## EXECUTION PLAN` | L84–93 | `docs/design/00-INDEX.md`, `docs/design/phases/phase-*.md` (7 files) | **Mapped** |
| `## DEFINITION OF DONE` | L94–99 | `docs/design/spec/07-quality-gates.md`, `docs/design/phases/phase-7-polish.md` | **Mapped** |

---

## 3. Concrete Value & Token Coverage Matrix

Every token and metric below was verified by automated scan across the destination files:

### Colors & CSS Tokens
- Obsidian Surfaces: `--bg-0 #060609`, `--bg-1 #0B0B11`, `--bg-2 #11111A`, `--bg-3 #181824`, `--bg-4 #20202E` -> **Verified in `spec/01-foundations.md`**
- Line Tokens: `--line-soft rgba(255,255,255,.05)`, `--line rgba(255,255,255,.09)`, `--line-strong rgba(255,255,255,.16)` -> **Verified in `spec/01-foundations.md`**
- Text Tokens: `--text #ECEAF4`, `--text-dim #A09EB4`, `--text-mute #6B6980` -> **Verified in `spec/01-foundations.md`**
- Brand Gold: `--gold #D4AF37`, `--gold-hi #F2D27A`, `--gold-lo #8C7424` -> **Verified in `spec/01-foundations.md`**
- Brand Violet: `--violet #8B5CF6`, `--violet-hi #B39DFF`, `--violet-lo #4B2FA8` -> **Verified in `spec/01-foundations.md`**
- Status Tokens: Running `#34D399`, Warning `#F59E0B`, Critical `#F43F5E`, Stopped `#6B6980`, Restarting `#60A5FA` -> **Verified in `spec/01-foundations.md`**

### Geometry, Typography & Motion Tokens
- Radius: `6 / 10 / 16 / 24px` -> **Verified**
- Spacing: `4px` base scale -> **Verified**
- Blur: `12 / 24 / 40px` -> **Verified**
- Typography: `Space Grotesk`, `JetBrains Mono`, `@fontsource`, `tabular-nums` -> **Verified**
- Type Scale Jump: `48 to 72px` against `11px` micro-labels with `0.12em` tracking -> **Verified**
- Motion Easing: `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-inout cubic-bezier(.65,0,.35,1)`, `--spring` -> **Verified**
- Durations: `120 / 220 / 420 / 700ms` -> **Verified**

### Numerical Budgets, Frame Rates & Dimensions
- Viewports: `1280px` desktop down to `390px` mobile -> **Verified**
- Performance: `30fps` canvas cap, `60fps` telemetry target, `3%` static grain, `4%` max canvas CPU, `60KB` gzip budget -> **Verified**
- Timings & Offsets: `1.2s` hold/boot duration, `40ms` stagger, `12px` rise, `0.97` button press scale, `4px` magnetic hover -> **Verified**

### Components & Routes
- 10 Signature Components: `GlassPanel`, `MetricNumber`, `Sparkline`, `RadialGauge`, `StatusDot`, `HeatTile`, `SkeletonShimmer`, `EmptyState`, `ConfirmDangerDialog`, `Toast` -> **Verified**
- 14 Route Paths: `/login`, `/dashboard`, `/containers`, `/containers/:id`, `/host`, `/projects`, `/logs`, `/events`, `/alerts`, `/resources`, `/audit`, `/users`, `/profile`, `/settings` -> **Verified**

### Anti-Patterns
- All 11 anti-patterns verified verbatim across guardrails and specs -> **Verified**

---

## 4. Character Counts & Budget Verification

| Destination File Path | Character Count | Budget / Limit | Compliance |
| :--- | :--- | :--- | :--- |
| `.agents/rules/design-guardrails.md` | **2,172** | < 4,000 | **PASS** |
| `.agents/workflows/run-design-phase.md` | **3,203** | < 12,000 | **PASS** |
| `docs/design/00-INDEX.md` | 6,801 | — | Pass |
| `docs/design/OPEN_QUESTIONS.md` | 4,278 | — | Pass |
| `docs/design/spec/01-foundations.md` | 5,902 | — | Pass |
| `docs/design/spec/02-atmosphere.md` | 3,934 | — | Pass |
| `docs/design/spec/03-app-shell.md` | 3,901 | — | Pass |
| `docs/design/spec/04-components.md` | 5,123 | — | Pass |
| `docs/design/spec/05-dataviz.md` | 2,906 | — | Pass |
| `docs/design/spec/06-states-microcopy.md` | 2,957 | — | Pass |
| `docs/design/spec/07-quality-gates.md` | 3,864 | — | Pass |
| `docs/design/pages/login.md` | 2,953 | — | Pass |
| `docs/design/pages/dashboard.md` | 4,709 | — | Pass |
| `docs/design/pages/containers.md` | 4,189 | — | Pass |
| `docs/design/pages/container-detail.md` | 4,369 | — | Pass |
| `docs/design/pages/host.md` | 3,351 | — | Pass |
| `docs/design/pages/projects.md` | 3,444 | — | Pass |
| `docs/design/pages/logs.md` | 3,700 | — | Pass |
| `docs/design/pages/events.md` | 3,021 | — | Pass |
| `docs/design/pages/alerts.md` | 3,554 | — | Pass |
| `docs/design/pages/resources.md` | 3,274 | — | Pass |
| `docs/design/pages/audit.md` | 3,136 | — | Pass |
| `docs/design/pages/users-profile-settings.md` | 3,958 | — | Pass |
| `docs/design/phases/phase-1-foundations.md` | 4,086 | — | Pass |
| `docs/design/phases/phase-2-shell.md` | 3,455 | — | Pass |
| `docs/design/phases/phase-3-components.md` | 4,165 | — | Pass |
| `docs/design/phases/phase-4-login-dashboard-containers.md` | 4,396 | — | Pass |
| `docs/design/phases/phase-5-remaining-pages.md` | 4,362 | — | Pass |
| `docs/design/phases/phase-6-admin-pages-quiet-mode.md` | 3,583 | — | Pass |
| `docs/design/phases/phase-7-polish.md` | 3,694 | — | Pass |

---

## 5. Duplication & Omission Analysis

### Unmapped Items
None. Every section, constraint, instruction, and token from the original master prompt has been assigned to its authoritative specification and runnable phase file.

### Intentional Duplication Rationale
- **Guardrails**: Hard constraints, token usage rules, and the anti-patterns list are intentionally duplicated into `.agents/rules/design-guardrails.md` so that every Antigravity coding session is constrained by them without requiring manual prompt injection.
- **Phase Prompts**: Each phase prompt duplicates the relevant scope and "Must not" constraints directly into its runnable body so that an agent reading only the phase prompt and its "Read first" dependencies can execute the phase without context loss.
