# Design Specification: Prompt 13 — Audit Log

**Date:** 2026-11-23  
**Status:** Approved  
**Author:** DockPilot Team  

---

## 1. Objective

Provide a trustworthy, immutable, and easily accessible record of system activity and control actions:
1. **Append-Only Architecture**: Zero update or delete operations exposed via the API.
2. **Comprehensive Filtering & Pagination**: Filter by actor (user), action, target, execution result, and time window with pagination.
3. **CSV Export**: Streamed CSV export honoring active filters with bounded streaming.
4. **Role-Based Access Control**: Strictly restricted to administrators (`Role.ADMIN`); 403 Forbidden for non-admins.
5. **Frontend Management UI**: Standalone `/audit` route featuring a filterable table, relative/absolute timestamp toggle, detail drawer with JSON payload inspection and error traces, and one-click CSV export.

---

## 2. Configuration & Settings

Config file: `config/audit.yaml` (loaded into `Settings` in `backend/app/core/config.py`):
```yaml
audit_page_size_default: 50
audit_page_size_max: 200
audit_export_max_rows: 5000
audit_retention_days: 90
```

---

## 3. Data Model

Uses existing `AuditLog` model in `backend/app/models/audit.py`:
- `id`: UUID (Primary Key)
- `timestamp`: DateTime(timezone=True), indexed
- `user_id`: UUID, nullable
- `username`: String(64), indexed
- `action`: String(64), indexed
- `target_type`: String(64)
- `target_id`: String(128), nullable
- `payload`: JSON, nullable
- `result`: String(32), default "pending"
- `error_message`: Text, nullable
- `ip_address`: String(45), nullable

---

## 4. API Endpoints

### 4.1. List Audit Logs
- **Route**: `GET /api/v1/audit` & `GET /audit`
- **RBAC**: Admin only (`Role.ADMIN`)
- **Query Parameters**:
  - `user`: Optional[str] (username substring or exact)
  - `action`: Optional[str] (action pattern or exact)
  - `target_type`: Optional[str]
  - `target_id`: Optional[str]
  - `result`: Optional[str] (`success`, `failure`, `pending`)
  - `since`: Optional[datetime]
  - `until`: Optional[datetime]
  - `page`: int = 1
  - `page_size`: int = 50
  - `sort_order`: str = "desc" ("asc" or "desc")
- **Response**: `AuditLogsListResponse`

### 4.2. Export Audit Logs
- **Route**: `GET /api/v1/audit/export` & `GET /audit/export`
- **RBAC**: Admin only (`Role.ADMIN`)
- **Query Parameters**: Same filters as list query (`user`, `action`, `target_type`, `target_id`, `result`, `since`, `until`)
- **Response**: `StreamingResponse(media_type="text/csv")` with header `Content-Disposition: attachment; filename=audit_log_<timestamp>.csv`

### 4.3. Append-Only Guarantee
- No `POST`, `PUT`, `PATCH`, or `DELETE` endpoints for `/audit` exist in the router.
- Audit records are generated strictly by backend services as side-effects of control actions.

---

## 5. Frontend Architecture

### 5.1. Route & Navigation
- Route: `/audit` (Lazy-loaded standalone component `AuditComponent`)
- Navigation: Header toolbar & sidebar link restricted to `canAdmin()`.

### 5.2. Component Structure
- `AuditComponent`:
  - Filter bar: user, action category selector, result filter, date preset dropdown (All, Today, 24h, 7d, 30d).
  - Time toggle: Button toggle between Relative (`5m ago`) and Absolute (`YYYY-MM-DD HH:mm:ss UTC`).
  - Table: columns for Timestamp, Actor, Action Badge, Target, Result Chip, Client IP, and View Detail action.
  - Detail Drawer (`mat-sidenav` or slide-over drawer): displays full record metadata, error message alert (if failure), and formatted JSON payload.
  - CSV Export button with loading spinner state.
- `AuditStore`:
  - Signals for `items`, `total`, `loading`, `error`, `selectedItem`, `filters`, `relativeTime`.

---

## 6. Testing Strategy

1. **Backend Tests (`backend/tests/test_audit_api.py`)**:
   - `test_audit_list_unauthorized`: Non-authenticated -> 401.
   - `test_audit_list_non_admin`: Viewer and Operator -> 403.
   - `test_audit_list_filters`: Filtering by user, action, result, target, time window.
   - `test_audit_pagination`: Pagination boundary checks.
   - `test_audit_export_csv`: Verifies streaming CSV output, headers, and active filter application.
   - `test_control_actions_produce_audit`: Parameterized check across container, compose, resources, and terminal control routes confirming both success and failure produce audit entries.
   - `test_append_only_rejections`: Verifies POST/PUT/DELETE on `/audit` return 405 Method Not Allowed.
2. **Frontend Tests (`audit.component.spec.ts` & `audit.service.spec.ts`)**:
   - Component rendering, filters reactivity, detail drawer open/close, time toggle formatting, and CSV download trigger.
