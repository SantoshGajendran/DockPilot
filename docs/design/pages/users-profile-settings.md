# Pages: Users, Profile & Settings (/users, /profile, /settings)

## Purpose
Governs administrative and preference surfaces across `/users`, `/profile`, and `/settings`, featuring calm glass form sections, custom floating-label inputs, the sticky unsaved changes action bar, and the user-facing Quiet Mode toggle.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Paths & Metadata
- **Route paths**: `/users`, `/profile`, `/settings`
- **Data used**:
  - `/users`: User accounts list, assigned RBAC roles (`viewer`, `operator`, `admin`), MFA/TOTP enrollment status, account active flags.
  - `/profile`: Authenticated user credentials, display name, password update, two-factor auth setup.
  - `/settings`: System configuration, polling intervals, telemetry retention policies, and UI display settings (including Quiet Mode).

### Calm, Spacious Form Styling
- Spacious, clean layout grouped into distinct glass panels (`GlassPanel`).
- **Custom input fields**:
  - Floating label with subtle transition on focus.
  - Animated bottom underline in brand gold (`--gold #D4AF37`) activating on focus.
  - Completely eliminates default Material outlines, boxes, and notches.
  - Input text in `Space Grotesk` (or `JetBrains Mono` for secrets/tokens).

### Sticky Save Bar (Unsaved Changes)
- A floating or sticky save bar anchored at the bottom of the viewport.
- Appears ONLY when the user has dirty form state (`isDirty === true`).
- Animates smoothly into view (`120 / 220ms` duration).
- Displays "Reset Changes" (glass outline) and "Save Changes" (solid gold primary button).
- Reuses existing `pendingChangesGuard` to prevent accidental navigation loss; does not alter guard logic.

### Quiet Mode Toggle (Settings / Profile)
- Provides a prominent, user-facing **"Quiet Mode"** toggle switch in Settings and Profile.
- When enabled:
  - Disables the ambient background canvas.
  - Disables pointer tilt and parallax effects.
  - Retains simple opacity fades for transitions.
  - Persists preference across user sessions.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Section enclosures for settings groups.
- [Primary Button](file:///docs/design/spec/04-components.md#primary-button) - Save changes action.
- [ConfirmDangerDialog](file:///docs/design/spec/04-components.md#9-confirmdangerdialog) - User deletion and credentials reset.
- [Toast](file:///docs/design/spec/04-components.md#10-toast) - Save confirmation notifications.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Form loading states.

### Designed States
- **Loading state**: Form field rows and section panels pulse with `SkeletonShimmer`.
- **Empty state**: Empty state for secondary user accounts or optional API tokens.
- **Error state**: Inline field validation errors rendered in high-contrast critical rose (`#F43F5E`) with clear remediation guidance.
- **Offline state**: Top banner indicates offline state; form submission buttons safely disabled.

## Acceptance criteria
- [ ] Forms styled with custom floating-label inputs and animated gold underlines without Material outlines.
- [ ] Form sections grouped in spacious `GlassPanel` containers.
- [ ] Sticky save bar slides into view only when unsaved form changes exist.
- [ ] Existing `pendingChangesGuard` protects unsaved form states without logic changes.
- [ ] Quiet Mode toggle cleanly disables canvas, tilt, and parallax while keeping simple fades.
- [ ] RBAC boundaries enforced (admin settings hidden from non-admin roles).

## Must not
- Do NOT use default Angular Material `mat-form-field` outlines, subscript wrappers, or ripples.
- Do NOT alter user management API endpoints, role permissions, or password hashing.
- Do NOT alter or bypass `pendingChangesGuard` routing logic.
