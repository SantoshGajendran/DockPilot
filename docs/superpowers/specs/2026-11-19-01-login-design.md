# Design Specification: DockPilot Login Page & Authentication Subsystem (Prompt 01)

**Date:** 2026-11-19  
**Status:** Approved  
**Scope:** Master Prompt 01 — Login Page, Auth & Role-Aware Sessions

---

## 1. Overview & Goals

DockPilot requires a secure, role-aware authentication subsystem.
The goal of Prompt 01 is to deliver:
* Backend authentication API endpoints (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`).
* Argon2 password hashing using `argon2-cffi`.
* Dual-token session management: short-lived JWT access token in the response body; rotating refresh token in an `httpOnly`, `SameSite=Lax` secure cookie.
* Brute-force protection: rate limiting and temporary account lockout after $N$ consecutive failures.
* Complete audit recording for all login attempts (success and failure), token refreshes, and logouts.
* First-run admin bootstrapping from environment variables or application configuration when the database contains zero users.
* Standalone Angular 19 `/login` page with reactive forms, password visibility toggle, inline validation, loading states, and generic error feedback.
* Frontend session lifecycle management: silent token refresh on app launch, return-URL preservation, and session-expired modal handling.

---

## 2. Global Constraints & Standards

1. **Zero Hardcoded Domain Terms:** All intervals, token lifetimes, lockout limits, roles, and error strings originate from `config/app.yaml`, `app/core/constants.py`, or the database.
2. **Layered Backend Architecture:** Every feature implements a router, service layer, data schemas, and test suite.
3. **Role Enforcement Hierarchy:** Role checks (`viewer`, `operator`, `admin`) are strictly enforced in the backend dependencies first, then mirrored in frontend navigation and route guards.
4. **Audit Requirement:** Every control and auth action writes an audit record before/during execution, then logs the outcome.
5. **No User Enumeration:** Failed authentication returns generic message `"Invalid username or password"` regardless of whether the username exists or password was incorrect.

---

## 3. Backend Specification

### 3.1 Security Core (`backend/app/core/security.py`)
* **Password Hashing:**
  * Uses `argon2.PasswordHasher(time_cost=2, memory_cost=65536, parallelism=1, hash_len=32, type=Type.ID)`.
  * `hash_password(plain_password: str) -> str`: Generates Argon2id string.
  * `verify_password(plain_password: str, hashed_password: str) -> bool`: Safe verification.
* **JWT Token Generation & Decoding:**
  * Uses `jwt` (PyJWT) with algorithm `HS256` and secret `settings.jwt_secret`.
  * `create_access_token(user_id: UUID, username: str, role: str) -> str`: Expires in `settings.jwt_access_expire_minutes` (default 15 mins). Payload: `{"sub": str(user_id), "username": username, "role": role, "type": "access", "exp": ...}`.
  * `create_refresh_token(user_id: UUID) -> str`: Expires in `settings.jwt_refresh_expire_days` (default 7 days). Payload: `{"sub": str(user_id), "token_id": str(uuid4()), "type": "refresh", "exp": ...}`.
  * `decode_token(token: str) -> Dict[str, Any]`: Verifies signature, expiration, and payload integrity.

### 3.2 Configuration Updates (`config/app.yaml` & `backend/app/core/config.py`)
New configuration keys:
```yaml
max_login_attempts: 5
lockout_duration_minutes: 15
default_admin_user: "admin"
default_admin_password: "dockpilot_admin_2026"
```

### 3.3 Data Schemas (`backend/app/schemas/auth.py`)
```python
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class UserPublic(BaseModel):
    id: UUID
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
```

### 3.4 Service Layer (`backend/app/services/auth_service.py`)
* `authenticate_user(db: AsyncSession, credentials: LoginRequest, ip: Optional[str]) -> Tuple[User, str, str]`:
  * Look up user by username.
  * If user found and `user.locked_until` is set and in the future:
    * Insert `AuditLog(action="auth.login", target_type="user", target_id=str(user.id), username=user.username, result="failure", payload={"reason": "account_locked"}, ip_address=ip)`.
    * Raise HTTP 401: `"Account temporarily locked. Try again later."`
  * Verify password with `verify_password`.
  * If invalid user or invalid password:
    * If user exists: increment `user.failed_login_attempts`. If $\ge$ `settings.max_login_attempts`, set `user.locked_until = now + timedelta(minutes=settings.lockout_duration_minutes)`.
    * Insert `AuditLog(action="auth.login", target_type="user", target_id=str(user.id) if user else None, username=credentials.username, result="failure", payload={"reason": "bad_credentials"}, ip_address=ip)`.
    * Commit DB changes.
    * Raise HTTP 401: `"Invalid username or password"`.
  * If password valid and user active:
    * Reset `user.failed_login_attempts = 0`, `user.locked_until = None`.
    * Insert `AuditLog(action="auth.login", target_type="user", target_id=str(user.id), username=user.username, result="success", ip_address=ip)`.
    * Commit DB changes.
    * Return `(user, access_token, refresh_token)`.
* `refresh_tokens(db: AsyncSession, refresh_token: str) -> Tuple[User, str, str]`:
  * Decodes token; verifies `type == "refresh"`.
  * Fetches user by ID from DB; verifies `is_active`.
  * Generates new access token and new rotated refresh token.
  * Logs `AuditLog(action="auth.refresh", target_type="user", target_id=str(user.id), username=user.username, result="success")`.
  * Returns `(user, new_access_token, new_refresh_token)`.
* `logout(response: Response, user_id: Optional[UUID], username: Optional[str]) -> None`:
  * Clears `refresh_token` cookie.
  * Logs `AuditLog(action="auth.logout", result="success")`.

### 3.5 API Endpoints (`backend/app/api/v1/auth.py`)
* `POST /api/v1/auth/login`:
  * Calls `authenticate_user`.
  * Sets cookie: `response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, samesite="lax", max_age=7*24*3600, path="/api/v1/auth", secure=settings.environment == "production")`.
  * Returns `TokenResponse(access_token=access_token, user=UserPublic.model_validate(user))`.
* `POST /api/v1/auth/refresh`:
  * Extracts cookie `refresh_token`.
  * Calls `refresh_tokens`.
  * Updates cookie with rotated refresh token.
  * Returns `TokenResponse`.
* `POST /api/v1/auth/logout`:
  * Calls `logout`.
  * Returns `{"status": "ok", "message": "Successfully logged out"}`.
* `GET /api/v1/auth/me`:
  * Protected by `Depends(get_current_user)`.
  * Returns `UserPublic.model_validate(current_user)`.

### 3.6 Dependency Injection & RBAC (`backend/app/api/deps.py`)
* `get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User`:
  * Decodes JWT access token.
  * Queries user from DB. If not found or inactive, raises 401.
* `require_role(min_role: Role)`:
  * Factory dependency checking `ROLE_HIERARCHY[current_user.role] >= ROLE_HIERARCHY[min_role]`.
  * If insufficient role, raises HTTP 403 Forbidden.

### 3.7 First-Run Bootstrap Lifespan (`backend/app/main.py`)
* Lifespan hook checks `SELECT COUNT(*) FROM users`.
* If 0: creates user `username = settings.default_admin_user`, `hashed_password = hash_password(settings.default_admin_password)`, `role = Role.ADMIN`, `is_active = True`.
* Logs `AuditLog(action="auth.bootstrap", target_type="user", result="success")`.

---

## 4. Frontend Specification

### 4.1 Routes & App Shell (`frontend/src/app/app.routes.ts`)
* Add `/login` route:
```typescript
{
  path: 'login',
  loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  data: { title: 'Sign In' }
}
```
* Update `authGuard` on protected children under `ShellComponent`.

### 4.2 `LoginComponent` (`frontend/src/app/features/auth/login.component.ts`)
* Angular Material Card layout (`mat-card`).
* Form fields:
  * `username`: `FormControl('', [Validators.required])`
  * `password`: `FormControl('', [Validators.required, Validators.minLength(8)])`
* Password show/hide toggle via `matSuffix` button with `visibility` / `visibility_off` icons.
* Loading state with `mat-progress-spinner` or disabled button while authenticating.
* Inline `mat-error` hints and top-level error banner for server-returned failures.
* Submits via `AuthService.login({ username, password })`. On success, navigates to `route.snapshot.queryParams['returnUrl'] || '/dashboard'`.

### 4.3 `AuthService` Enhancements (`frontend/src/app/core/services/auth.service.ts`)
* `readonly currentUser = signal<User | null>(null)`
* `readonly isAuthenticated = computed(() => !!this.currentUser())`
* `readonly userRole = computed(() => this.currentUser()?.role ?? null)`
* `login(credentials: LoginRequest): Observable<TokenResponse>`: Calls `/auth/login`, stores token in-memory, sets `currentUser`.
* `refreshSession(): Observable<TokenResponse>`: Calls `/auth/refresh` with `withCredentials: true`.
* `logout(): Observable<void>`: Calls `/auth/logout`, clears in-memory token, resets `currentUser` to null, navigates to `/login`.
* `init(): Observable<boolean>`: Silent refresh on app boot. Returns true if session restored, false otherwise.

### 4.4 Session Expired Modal (`frontend/src/app/features/auth/session-expired-dialog.component.ts`)
* Standalone `MatDialog` component.
* Message: `"Your session has expired. Please sign in again."`
* Action button: `"Go to Login"` (navigates to `/login`).

### 4.5 Interceptor Enhancements (`frontend/src/app/core/interceptors/error.interceptor.ts`)
* Catches HTTP 401 on non-auth endpoints.
* Triggers single silent refresh retry. If refresh fails or returns 401, invokes `AuthService.handleSessionExpired()` and opens dialog.

---

## 5. Testing Strategy

1. **Backend Tests (`backend/tests/test_auth.py`):**
   * `test_login_success`: Valid login returns 200, access token, sets httpOnly cookie, writes success audit log.
   * `test_login_wrong_password`: 401 generic message, increments failure count, writes failure audit log.
   * `test_login_lockout`: Consecutive failures lock account, subsequent attempt returns 401 locked.
   * `test_refresh_token_rotation`: Valid refresh cookie returns new access token and rotated refresh cookie.
   * `test_logout_invalidates_session`: Logout clears cookie; subsequent refresh fails.
   * `test_get_me`: Authenticated returns 200; unauthenticated returns 401.
   * `test_admin_bootstrap`: Empty database triggers creation of default admin.
   * `test_role_enforcement`: Viewer cannot access Admin-only route (403).
2. **Frontend Tests:**
   * `login.component.spec.ts`: Form validation, show/hide password toggle, loading spinner state, successful submission redirect.
   * `auth.guard.spec.ts`: Redirects unauthenticated user to `/login?returnUrl=...`.
   * `role.guard.spec.ts`: Blocks viewer from admin route, redirects to `/dashboard`.
   * `auth.service.spec.ts`: Silent refresh populates signals; logout resets state.

---

## 6. Acceptance Criteria

* [ ] `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` are functional and covered by unit tests.
* [ ] Argon2id password hashing is applied to all user passwords.
* [ ] Refresh tokens reside strictly in `httpOnly`, `SameSite=Lax` cookies; access tokens are short-lived.
* [ ] Lockout activates after configured failure count and writes audit logs.
* [ ] Initial admin user bootstrapped if DB is empty on startup.
* [ ] `/login` route rendered with Angular Material reactive form, validation, and loading indicators.
* [ ] App performs silent refresh on launch and redirects to `returnUrl`.
* [ ] Session expired dialog opens on refresh failure during active sessions.
* [ ] All backend and frontend tests pass.
