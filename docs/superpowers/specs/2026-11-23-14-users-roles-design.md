# Design Specification: Prompt 14 — Users and Roles

**Date:** 2026-11-23  
**Status:** Approved  
**Author:** DockPilot Team  

---

## 1. Objective

Provide secure, granular identity management and access control:
1. **Admin-Only User Administration**: Full CRUD on users (`viewer`, `operator`, `admin`) with zero hardcoded domain terms.
2. **Last-Admin Protection**: Guard against deleting, demoting, or disabling the last remaining active administrator.
3. **Password Management**: Administrator password reset with forced password change on next login (`force_password_change`).
4. **Two-Factor Authentication (TOTP RFC 6238)**: Optional 2FA enrolment with standard `otpauth://` URI and QR code, validation window (+/- 1 time step), and two-factor challenge during login.
5. **Session Management**: Persistent tracking of active login sessions with IP, User-Agent, last seen timestamp, and instant session revocation.
6. **Frontend UI**:
   - `/users`: Administrator table with search/filtering, user creation/editing, role selection, active/disabled toggle, and password reset dialog.
   - `/profile`: Self-service portal for changing password, enrolling and verifying 2FA with live QR code display, and reviewing/revoking active sessions.

---

## 2. Configuration & Constants

Configured in `config/users.yaml` and loaded into `Settings`:
```yaml
users_page_size_default: 20
users_page_size_max: 100
totp_issuer: "DockPilot"
totp_window: 1
session_max_age_days: 7
```

Constants in `app.core.constants`:
- `Role`: `viewer`, `operator`, `admin`
- `AuditAction`: `user.create`, `user.update`, `user.delete`, `user.reset_password`, `user.change_password`, `user.2fa_enrol`, `user.2fa_verify`, `user.2fa_disable`, `session.revoke`

---

## 3. Data Model & Migrations

### 3.1. User Model Extensions (`backend/app/models/user.py`)
- `force_password_change`: Boolean, default False, nullable=False
- `totp_secret`: String(64), nullable=True
- `totp_enabled`: Boolean, default False, nullable=False

### 3.2. UserSession Model (`backend/app/models/session.py`)
- `id`: UUID (Primary Key)
- `user_id`: UUID, foreign key to `users.id` (ondelete="CASCADE")
- `token_id`: String(64), index=True, nullable=False
- `ip_address`: String(45), nullable=True
- `user_agent`: String(255), nullable=True
- `created_at`: DateTime(timezone=True), default UTC now
- `last_seen_at`: DateTime(timezone=True), default UTC now
- `is_revoked`: Boolean, default False, nullable=False

---

## 4. API Specification

### 4.1. Users Management (`/api/v1/users`) — Admin Only
- `GET /api/v1/users`: List users with pagination and search.
- `POST /api/v1/users`: Create user (username, password, role, is_active, force_password_change).
- `GET /api/v1/users/{id}`: Get single user details.
- `PUT /api/v1/users/{id}`: Update user (role, is_active, email). Rejects last admin demotion/deactivation.
- `DELETE /api/v1/users/{id}`: Delete user. Rejects last admin deletion.
- `POST /api/v1/users/{id}/reset-password`: Reset password, sets `force_password_change=True`.

### 4.2. Profile & Self-Service (`/api/v1/profile` & `/api/v1/auth`)
- `POST /api/v1/auth/change-password`: Change password with current password verification.
- `POST /api/v1/auth/2fa/enrol`: Generate TOTP secret and `otpauth://` URI.
- `POST /api/v1/auth/2fa/verify`: Verify 6-digit TOTP code and enable 2FA.
- `POST /api/v1/auth/2fa/disable`: Disable 2FA.
- `GET /api/v1/auth/sessions`: List active sessions with current session flag.
- `POST /api/v1/auth/sessions/{id}/revoke`: Revoke specified session.
- `POST /api/v1/auth/sessions/revoke-all`: Revoke all sessions except current.

---

## 5. Frontend Architecture

### 5.1. Routes
- `/users`: `UsersComponent` (lazy-loaded, `canActivate: [roleGuard]`, role: 'admin')
- `/profile`: `ProfileComponent` (lazy-loaded, `canActivate: [authGuard]`)

### 5.2. Components & Dialogs
- `UsersComponent`: Filterable data table, role badges, action buttons.
- `UserDialogComponent`: Modal for creating and editing user credentials and roles.
- `ResetPasswordDialogComponent`: Modal for admin-initiated password resets.
- `ProfileComponent`:
  - Password change form.
  - 2FA setup wizard displaying rendered QR code via `qrcode` package, manual secret key, and 6-digit verification code input.
  - Session manager displaying IP, User-Agent, relative activity time, and revoke triggers.

---

## 6. Testing Strategy

1. **Backend Tests (`backend/tests/test_users_api.py`)**:
   - Role matrix RBAC validation (Admin 200, Viewer/Operator 403, Unauth 401).
   - Last-admin protection: cannot delete, demote, or deactivate the last admin.
   - Admin password reset with `force_password_change`.
   - TOTP secret generation, verification window (+/- 1 step), and disable.
   - Active session tracking, revoke individual, revoke all others, rejected refresh on revoked token.
2. **Frontend Tests**:
   - `users.service.spec.ts` & `profile.service.spec.ts`.
   - `users.store.spec.ts` & `profile.store.spec.ts`.
   - `users.component.spec.ts` & `profile.component.spec.ts`.
