# Route Audit: Container Details (/containers/:id)

## Overview & Visual Representation
- **Route Path**: `/containers/:id` (tested with `c1`: `dockpilot-redis`)
- **Component**: `ContainerDetailComponent` (`frontend/src/app/features/containers/detail/container-detail.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/container-detail.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/container-detail/populated-1920x1080-dark.png` | `screenshots/container-detail/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/container-detail/populated-1440x900-dark.png` | `screenshots/container-detail/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/container-detail/populated-1280x720-dark.png` | `screenshots/container-detail/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/container-detail/populated-768x1024-dark.png` | `screenshots/container-detail/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/container-detail/populated-390x844-dark.png` | `screenshots/container-detail/populated-390x844-light.png` |

---

## Findings

### DF-022 Hardcoded inline style heights on terminal and stats tabs
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: The container detail template hardcodes `style="height: 560px;"`, `style="height: 100%;"`, and `style="width: 35%"` directly on HTML elements.
- Evidence: `frontend/src/app/features/containers/detail/container-detail.component.html:295, 296, 324`.
- Why it matters: Inline styles break CSS inheritance, prevent responsive viewport scaling on smaller laptop screens (720p/900p), and trigger CSP warnings.
- Recommended fix: Move layout dimensions into `container-detail.component.scss` utilizing flexbox and `min-height: clamp(380px, 50vh, 650px);`.
- Related redesign file: `docs/design/pages/container-detail.md`

### DF-023 Deep selector ::ng-deep overriding MatTab header styles
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: CODE / S3 / 2 / XS
- What is wrong: Tab styling bypasses Angular view encapsulation using `::ng-deep .mat-mdc-tab-header { border-bottom: 1px solid rgba(255, 255, 255, 0.08); }`.
- Evidence: `frontend/src/app/features/containers/detail/container-detail.component.scss:244`.
- Why it matters: `::ng-deep` is deprecated and leaks styles globally to other tab components in the application.
- Recommended fix: Define tab border tokens in `theme.scss` via `--mat-tab-header-divider-color` or custom tab wrapper.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-024 Low contrast tab labels in unselected state
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Inactive tab labels ("ENV VARS", "PORTS & MOUNTS", "HEALTH LOGS") use `#64748B` on `#08090E`, resulting in a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/container-detail/populated-1440x900-dark.png`, `frontend/src/app/features/containers/detail/container-detail.component.scss:198`, axe violation `color-contrast`.
- Why it matters: Users with visual impairments cannot easily discover available inspection tabs.
- Recommended fix: Increase unselected tab color to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-025 Terminal container height collapses on mobile viewports
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: On mobile (390x844), the embedded xterm container clips horizontal text and collapses to an unusable 200px scrollbox.
- Evidence: `screenshots/container-detail/populated-390x844-dark.png`.
- Why it matters: Mobile administrators attempting emergency inspection cannot read shell outputs or type commands.
- Recommended fix: Implement a full-screen drawer or dedicated modal mode for the terminal on screens narrower than 768px.
- Related redesign file: `docs/design/pages/container-detail.md`

### DF-026 Obscured environment variable values lack copy-all affordance
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: COMPONENT / S3 / 3 / S
- What is wrong: While secrets are properly masked by default, there is no one-click "Copy all environment variables" button, requiring manual unmasking and copying variable by variable.
- Evidence: `screenshots/container-detail/populated-1440x900-dark.png`, `frontend/src/app/features/containers/detail/container-detail.component.html:184-210`.
- Why it matters: Cumbersome debugging workflow during configuration audits.
- Recommended fix: Add a "Copy .env format" toolbar button in the Environment Variables tab header.
- Related redesign file: `docs/design/pages/container-detail.md`

---

## What Works Well
- Real-time CPU and memory graphs glide smoothly with gradient fills.
- Container restart policy, health check logs, and network IP details are clearly presented in structured inspector cards.
- Quick action buttons (Restart, Stop, Exec) are pinned at the top header for fast access.

---

## Top 3 Improvements
1. Remove inline style height hacks and deprecate `::ng-deep` tab overrides.
2. Provide full-screen terminal expansion for mobile and tablet screens.
3. Fix unselected tab text contrast to satisfy WCAG AA minimum 4.5:1.
