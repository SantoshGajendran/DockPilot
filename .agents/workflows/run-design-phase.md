# Run Design Phase Workflow

Execute one discrete phase of the DockPilot "Flight Deck" UI redesign (Phases 1 to 7).

## Workflow Execution Steps

### 1. Select Phase
Ask the user which phase number (1 through 7) to execute, if not provided in the prompt:
- **Phase 1**: Tokens, Fonts, Global Styles & Atmosphere (`docs/design/phases/phase-1-foundations.md`)
- **Phase 2**: Application Shell & Transitions (`docs/design/phases/phase-2-shell.md`)
- **Phase 3**: Signature Shared Components & Demo Route (`docs/design/phases/phase-3-components.md`)
- **Phase 4**: Login, Dashboard & Containers Core Pages (`docs/design/phases/phase-4-login-dashboard-containers.md`)
- **Phase 5**: Host, Logs, Events, Alerts, Projects & Resources (`docs/design/phases/phase-5-remaining-pages.md`)
- **Phase 6**: Audit, Admin Forms, Quiet Mode & Reduced Motion (`docs/design/phases/phase-6-admin-pages-quiet-mode.md`)
- **Phase 7**: Polish, Performance Profile & Quality Sign-Off (`docs/design/phases/phase-7-polish.md`)

### 2. Load Prerequisites
Read the target phase file and every file specified in its `## Read first` block:
1. Always load `.agents/rules/design-guardrails.md` and `docs/design/spec/01-foundations.md`.
2. Load all supplementary specs (`spec/*.md`) and page prompts (`pages/*.md`) referenced by the phase.
3. Verify all requirements, tokens, and constraints before touching any code.

### 3. Implementation Guardrails
- **Presentation layer only**: Do NOT change backend, API contracts, route paths, guards, interceptors, Signal store logic, models, RBAC behavior, or two-phase confirmation/audit flows.
- **Tokens**: Use CSS custom properties in `styles/theme.scss`. Never hard-code colours or font stacks.
- **Brand limits**: Gold must stay under ~8% of screen area; violet for live telemetry/charts. No gold-to-violet gradient blobs.
- **Anti-patterns**: Zero generic white cards on grey, zero default Material surfaces, zero Inter/Roboto, zero emoji icons.
- **Animation**: Animate only `transform` and `opacity`.

### 4. Step Execution
Execute the ordered steps defined in the phase file's `## Steps` section. Keep edits minimal, modular, and adhering strictly to Angular 19 standalone architecture with Signals.

### 5. Verification Protocol
After completing the steps:
1. Run frontend tests and build:
   ```bash
   cd frontend && npm test && ng build
   ```
2. Fix any compilation errors or test failures caused by markup changes (update test selectors only for intentional markup updates).
3. Open the application in the browser at `http://localhost:4200`.
4. Capture screenshots at desktop (1280px) and mobile (390px) viewports.
5. Verify `prefers-reduced-motion` and Quiet Mode where applicable to the phase.

### 6. Report Back & Hard Stop
Provide a concise phase completion report:
- Summary of files created, modified, or deleted.
- Summary of work completed vs items skipped (with reasons).
- Verification results: build status, unit test pass rate, and responsive screenshots.
- Any open questions or architectural notes.

**CRITICAL**: STOP immediately after reporting. Wait for human review and explicit approval before starting the next phase. Never start the next phase on your own.
