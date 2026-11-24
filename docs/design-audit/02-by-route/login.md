# Route Audit: Sign In (/login)

## Overview & Visual Representation
- **Route Path**: `/login`
- **Component**: `LoginComponent` (`frontend/src/app/features/auth/login.component.ts`)
- **Access Level**: Public / Unauthenticated
- **Redesign Spec Reference**: `docs/design/pages/login.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/login/populated-1920x1080-dark.png` | `screenshots/login/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/login/populated-1440x900-dark.png` | `screenshots/login/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/login/populated-1280x720-dark.png` | `screenshots/login/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/login/populated-768x1024-dark.png` | `screenshots/login/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/login/populated-390x844-dark.png` | `screenshots/login/populated-390x844-light.png` |

---

## Findings

### DF-001 Inadequate text contrast on subtitle in light theme
- Route(s): `/login`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: The brand subtitle "FLIGHT DECK ACCESS // OPERATOR CREDENTIALS" renders `#A09EB4` against the light theme background `#F4F3F8`, yielding a contrast ratio of 2.76:1, failing WCAG AA (minimum 4.5:1).
- Evidence: `screenshots/login/populated-1440x900-light.png`, `frontend/src/app/features/auth/login.component.scss:32`, measured contrast 2.76:1.
- Why it matters: Operator instructions and system security classifications are illegible for users in high ambient light environments or with low vision.
- Recommended fix: In `login.component.scss`, bind `.brand-subtitle` to `var(--text-dim)` which resolves to `#545268` in light mode (contrast 5.8:1).
- Related redesign file: `docs/design/pages/login.md`

### DF-002 Non-standard input field padding violating 4px grid
- Route(s): `/login`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The `.obsidian-input` fields use `padding: 10px 14px;`, which injects non-standard 10px and 14px metrics not on the 4px geometric scale.
- Evidence: `frontend/src/app/features/auth/login.component.scss:84`, measured padding `10px 14px`.
- Why it matters: Inconsistent vertical rhythm causes vertical misalignment when adjacent to icon containers and error labels.
- Recommended fix: Change padding to `12px 16px` (`var(--space-3) var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-003 Hardcoded rgba shadow on login glass panel
- Route(s): `/login`
- Category / Severity / Impact / Effort: CODE / S3 / 2 / XS
- What is wrong: The login container glass panel uses hardcoded `box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);` instead of referencing the elevation token system.
- Evidence: `frontend/src/app/features/auth/login.component.scss:48`, hardcoded `rgba(0, 0, 0, 0.45)`.
- Why it matters: In light theme, the dark 45% shadow creates an aggressive muddy halo rather than an ambient refraction shadow.
- Recommended fix: Replace with `box-shadow: var(--shadow-elevation-high)`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-004 Missing focus-visible ring on password visibility toggle
- Route(s): `/login`
- Category / Severity / Impact / Effort: A11Y / S2 / 3 / S
- What is wrong: The password visibility toggle button inside the password shell lacks a high-contrast focus indicator when navigated via keyboard Tab.
- Evidence: `frontend/src/app/features/auth/login.component.html:78`, `login.component.scss:108` (`outline: none` without `:focus-visible` ring).
- Why it matters: Keyboard-only users cannot visually verify that focus is currently on the reveal button before pressing Enter/Space.
- Recommended fix: Add `&:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-005 Fixed width card causes awkward margins on 390x844 mobile viewport
- Route(s): `/login`
- Category / Severity / Impact / Effort: RESPONSIVE / S3 / 2 / S
- What is wrong: On mobile (390px), `.login-wrapper` has `width: 440px; max-width: calc(100vw - 32px);`, resulting in edge clipping of the ignition ring effect and 16px horizontal margins that feel cramped.
- Evidence: `screenshots/login/populated-390x844-dark.png`, `frontend/src/app/features/auth/login.component.scss:21`.
- Why it matters: Visual tension on narrow devices with button touch targets compressing against viewport edges.
- Recommended fix: Use full-width mobile card layout (`width: 100%; border-radius: 16px;`) on `@media (max-width: 600px)`.
- Related redesign file: `docs/design/pages/login.md`

---

## What Works Well
- The ignition ring animation around the ship brand icon gives an immediate identity anchor.
- The two-stage authentication flow (credentials -> TOTP) cleanly manages cognitive load without overwhelming the initial view.
- Dual-theme token switching properly flips the background and input shell contrast.

---

## Top 3 Improvements
1. Tokenize all input spacing to a strict 4px scale (`12px 16px`).
2. Implement WCAG AA-compliant light mode contrast tokens for all secondary and uppercase micro-labels.
3. Optimize mobile container framing to adapt smoothly from 320px to 480px without clipping the ambient ignition effect.
