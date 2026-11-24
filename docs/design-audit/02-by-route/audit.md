# Route Audit: Audit Log (/audit)

## Overview & Visual Representation
- **Route Path**: `/audit`
- **Component**: `AuditComponent` (`frontend/src/app/features/audit/audit.component.ts`)
- **Access Level**: Restricted (`authGuard`, `roleGuard` - Admin only)
- **Redesign Spec Reference**: `docs/design/pages/audit.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/audit/populated-1920x1080-dark.png` | `screenshots/audit/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/audit/populated-1440x900-dark.png` | `screenshots/audit/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/audit/populated-1280x720-dark.png` | `screenshots/audit/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/audit/populated-768x1024-dark.png` | `screenshots/audit/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/audit/populated-390x844-dark.png` | `screenshots/audit/populated-390x844-light.png` |
| **Empty State** | `screenshots/audit/empty-1440x900-dark.png` | N/A |
| **Operator Restricted View** | `screenshots/audit/operator-restricted-1440x900-dark.png` | N/A |
| **Viewer Restricted View** | `screenshots/audit/viewer-restricted-1440x900-dark.png` | N/A |

---

## Findings

### DF-077 Expand payload buttons lack accessible names (button-name violation)
- Route(s): `/audit`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The chevron icon button used to expand JSON action details in each row has no `aria-label`, visible text, or `aria-expanded` state.
- Evidence: `frontend/src/app/features/audit/audit.component.html:82`, axe CRITICAL violation `button-name`.
- Why it matters: Screen readers announce "button" with no indication that it expands audit diff details.
- Recommended fix: Add `[attr.aria-label]="'Toggle details for event ' + entry.id"` and `[attr.aria-expanded]="isExpanded(entry.id)"`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-078 Low contrast action tags in audit table
- Route(s): `/audit`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Operation tags ("container.restart", "settings.update") render `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/audit/populated-1440x900-dark.png`, `frontend/src/app/features/audit/audit.component.scss:68`, axe violation `color-contrast`.
- Why it matters: Compliance officers scanning long security logs suffer visual fatigue and missed entries.
- Recommended fix: Bind action tags to `var(--text-dim)` (`#A09EB4` dark, `#545268` light).
- Related redesign file: `docs/design/pages/audit.md`

### DF-079 Silent redirection without permission denial toast for operators
- Route(s): `/audit`, `/users`
- Category / Severity / Impact / Effort: IA / S2 / 4 / S
- What is wrong: When an Operator navigates directly to `/audit`, `roleGuard` silently redirects them to `/dashboard` with no banner or toast explaining why the page did not load.
- Evidence: `frontend/src/app/core/guards/role.guard.ts:13`, `scratch/audit_data.json:rbacChecks`.
- Why it matters: Users assume a broken route or application malfunction rather than understanding role permissions.
- Recommended fix: Trigger a brief toast: "Access Denied: Administrator role required to view security audit logs" prior to redirection.
- Related redesign file: `docs/design/spec/03-app-shell.md`

### DF-080 JSON payload diff drawer overflows on mobile viewports
- Route(s): `/audit`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: Expanding an audit JSON payload on 390px screens forces horizontal scrollbars and clips code borders, causing the parent table to break layout.
- Evidence: `screenshots/audit/populated-390x844-dark.png`.
- Why it matters: Administrators responding to incidents on a phone cannot inspect payload parameter changes.
- Recommended fix: Wrap JSON payloads in `white-space: pre-wrap; word-break: break-all;` with responsive card container.
- Related redesign file: `docs/design/pages/audit.md`

### DF-081 Inconsistent non-4px padding in audit filter toolbar
- Route(s): `/audit`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The audit filter panel uses `padding: 10px 14px;` and `gap: 6px;` instead of standard 4px multiples.
- Evidence: `frontend/src/app/features/audit/audit.component.scss:24`.
- Why it matters: Misaligned inputs relative to the data table header underneath.
- Recommended fix: Standardize to `padding: 12px 16px; gap: 8px;` (`var(--space-3) var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

---

## What Works Well
- Security events are logged with actor, target, timestamp, and result (Success/Failure) in a clean ledger format.
- Monospace styling on Target IDs and User UUIDs prevents misreading hexadecimal characters.
- Fast filter search allows instant filtering by container or operator username.

---

## Top 3 Improvements
1. Add `aria-label` and `aria-expanded` attributes to JSON diff toggles.
2. Provide a clear permission explanation toast when `roleGuard` blocks access.
3. Fix action badge text contrast to satisfy WCAG AA minimum 4.5:1.
