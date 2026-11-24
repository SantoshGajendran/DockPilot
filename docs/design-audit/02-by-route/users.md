# Route Audit: Users & Roles (/users)

## Overview & Visual Representation
- **Route Path**: `/users`
- **Component**: `UsersComponent` (`frontend/src/app/features/users/users.component.ts`)
- **Access Level**: Restricted (`authGuard`, `roleGuard` - Admin only)
- **Redesign Spec Reference**: `docs/design/pages/users-profile-settings.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/users/populated-1920x1080-dark.png` | `screenshots/users/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/users/populated-1440x900-dark.png` | `screenshots/users/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/users/populated-1280x720-dark.png` | `screenshots/users/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/users/populated-768x1024-dark.png` | `screenshots/users/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/users/populated-390x844-dark.png` | `screenshots/users/populated-390x844-light.png` |
| **Empty State** | `screenshots/users/empty-1440x900-dark.png` | N/A |
| **Operator Restricted View** | `screenshots/users/operator-restricted-1440x900-dark.png` | N/A |
| **Viewer Restricted View** | `screenshots/users/viewer-restricted-1440x900-dark.png` | N/A |

---

## Findings

### DF-084 User action buttons lack accessible names (button-name violation)
- Route(s): `/users`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Table row action buttons (Edit Role, Reset Password, Deactivate User) render icons only without `aria-label` or visible text.
- Evidence: `frontend/src/app/features/users/users.component.html:108-132`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users cannot tell which button edits permissions versus deactivating an account.
- Recommended fix: Add `[attr.aria-label]="action.label + ' for user ' + u.username"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-085 Deep selector ::ng-deep overriding dialog select dropdowns
- Route(s): `/users`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Role assignment dialog uses `::ng-deep .mat-mdc-select-panel { background: #0B0D14 !important; }`.
- Evidence: `frontend/src/app/features/users/users.component.scss:236`.
- Why it matters: Breaks encapsulation, couples the styles to internal Material DOM structure, and leaks dark background to light theme dropdowns.
- Recommended fix: Use Angular Material theme tokens (`--mat-select-panel-background-color`) in `theme.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-086 Generic role badges lack semantic role distinction
- Route(s): `/users`
- Category / Severity / Impact / Effort: VISUAL / S3 / 3 / S
- What is wrong: The `admin`, `operator`, and `viewer` badges use generic grey and white tags with no visual hierarchy, making it hard to spot privileged accounts.
- Evidence: `screenshots/users/populated-1440x900-dark.png`, `frontend/src/app/features/users/users.component.scss:84`.
- Why it matters: Administrators need instant visual clarity regarding who holds root control over the cluster.
- Recommended fix: Give Admin roles a gold accent (`var(--gold)`), Operators a violet accent (`var(--violet)`), and Viewers a neutral slate tag.
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-087 Low contrast table header text in light theme
- Route(s): `/users`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Table column headers (`USERNAME`, `ROLE`, `STATUS`, `CREATED`) render `#94A3B8` on `#FFFFFF` in light theme, measuring 2.45:1 contrast, failing WCAG AA.
- Evidence: `screenshots/users/populated-1440x900-light.png`, `frontend/src/app/features/users/users.component.scss:62`, axe violation `color-contrast`.
- Why it matters: Table column headers are unreadable in light mode under bright sunlight or standard office lighting.
- Recommended fix: Bind header text to `var(--text-dim)` (`#545268` in light theme, contrast 5.8:1).
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-088 Inconsistent 6px and 10px spacings in user dialogs
- Route(s): `/users`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The Create User modal uses `padding: 10px; margin-bottom: 6px;` violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/users/dialogs/user-dialog.component.scss:32, 54`.
- Why it matters: Inconsistent spacing creates awkward visual gaps around dialog buttons.
- Recommended fix: Convert all dialog margins and paddings to standard 8px/12px/16px tokens.
- Related redesign file: `docs/design/spec/01-foundations.md`

---

## What Works Well
- Last-admin protection check prevents operators from accidentally locking themselves out of the system.
- User status (Active vs Inactive) is immediately readable via dedicated color-coded chips.
- Role hierarchy clearly enforces RBAC boundaries.

---

## Top 3 Improvements
1. Add `aria-label` to all row action icon buttons.
2. Distinctly style Admin, Operator, and Viewer role chips with signature brand colors.
3. Migrate `::ng-deep` select panel overrides to global Material theme variables.
