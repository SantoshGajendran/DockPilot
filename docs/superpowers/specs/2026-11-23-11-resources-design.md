# Design Specification: Prompt 11 — Images, Volumes, Networks

**Date:** 2026-11-23  
**Status:** Approved  
**Author:** DockPilot Team  

---

## 1. Objective

Provide comprehensive Docker resource housekeeping:
1. Inspect images, volumes, and networks with disk usage, creation age, tags, and "in-use by" container mappings.
2. Control actions:
   - Pull image as an asynchronous job with real-time SSE progress streaming.
   - Remove individual images, volumes, and networks with in-use and protected resource protection.
   - Prune dangling images, unused volumes, and unused networks via a 2-step dry-run preview + confirmation token workflow.
3. Protected resources list from `config/resources.yaml` that cannot be deleted or pruned.
4. Pre- and post-action audit logging for all mutations.
5. Standalone Angular route `/resources` with three tabs, unused highlights, prune wizard dialog, and pull image dialog.

---

## 2. Configuration & Protected Resources

Config file: `config/resources.yaml` (fallback defaults in `Settings`):
```yaml
protected_images:
  - "dockpilot*"
  - "postgres*"
  - "redis*"

protected_volumes:
  - "*dockpilot*"
  - "*postgres*"

protected_networks:
  - "bridge"
  - "host"
  - "none"
  - "dockpilot*"

prune_token_expire_seconds: 300
```

Validation helper:
- Uses `fnmatch.fnmatchcase` (case-insensitive on Windows/Linux) to match patterns.
- If an image, volume, or network matches any protected pattern, `is_protected = True`.
- Attempts to remove or prune a protected resource return `400 Bad Request` or are filtered out from prune batches.

---

## 3. DockerGateway Extensions

Interface methods in `DockerGateway`:
- `list_images() -> List[Dict[str, Any]]`
- `list_volumes() -> List[Dict[str, Any]]`
- `list_networks() -> List[Dict[str, Any]]`
- `pull_image(image_name: str) -> AsyncGenerator[Dict[str, Any], None]`
- `remove_image(image_id_or_name: str, force: bool = False) -> bool`
- `remove_volume(volume_name: str, force: bool = False) -> bool`
- `remove_network(network_id_or_name: str) -> bool`
- `prune_images(dangling_only: bool = True) -> Dict[str, Any]`
- `prune_volumes() -> Dict[str, Any]`
- `prune_networks() -> Dict[str, Any]`

Implemented in:
- `FakeGateway`: realistic state tracking for images, volumes, networks, pull simulation, delete, prune.
- `EngineGateway`: wraps `docker` SDK methods (`client.images`, `client.volumes`, `client.networks`).

---

## 4. In-Use Detection & Resource Service

`ResourceService` in `backend/app/services/resource_service.py`:
- `get_images()`:
  - Fetches all images from `DockerGateway.list_images()`.
  - Fetches all containers via `DockerGateway.list_containers(all=True)`.
  - Determines in-use containers matching image ID or tags.
  - Computes `is_in_use`, `in_use_by: List[ResourceInUseRef]`, and `is_protected`.
- `get_volumes()`:
  - Fetches all volumes.
  - Matches container volume mounts (`mount['Source'] == volume.name`).
  - Computes `is_in_use`, `in_use_by`, and `is_protected`.
- `get_networks()`:
  - Fetches all networks.
  - Matches container connected networks or built-in system networks (`bridge`, `host`, `none`).
  - Computes `is_in_use`, `in_use_by`, `is_built_in`, and `is_protected`.
- `remove_resource(resource_type, identifier)`:
  - Asserts not protected -> else 400.
  - Asserts not in use -> else 409.
  - Writes audit log (PENDING), executes removal, updates audit log (SUCCESS/FAILED).
- `preview_prune(resource_type)`:
  - Identifies prune candidates (dangling images / unused volumes / unused networks).
  - Filters out any protected resources.
  - Calculates space to be freed and item details.
  - Generates confirmation token signed with HMAC and expiry (`prune_token_expire_seconds`).
- `confirm_prune(resource_type, confirmation_token)`:
  - Validates and invalidates confirmation token.
  - Writes audit log (PENDING).
  - Calls `DockerGateway.prune_*()`.
  - Updates audit log with space reclaimed and deleted items.
- `pull_image_job(image_name, current_user)`:
  - Spawns asynchronous job in `JobManager`.
  - Streams pull logs and layer status.
  - Returns `JobResponse`.

---

## 5. REST API Endpoints (`/api/v1/resources`)

| Method | Path | Auth Tier | Description |
|---|---|---|---|
| GET | `/images` | Viewer | List images with size, age, tags, in-use, protected |
| DELETE | `/images/{id}` | Operator | Remove individual image |
| POST | `/images/pull` | Operator | Initiate image pull job |
| POST | `/images/prune/preview` | Operator | Preview dangling image prune + generate token |
| POST | `/images/prune` | Operator | Execute image prune with token |
| GET | `/volumes` | Viewer | List volumes with driver, size, in-use, protected |
| DELETE | `/volumes/{name}` | Operator | Remove individual volume |
| POST | `/volumes/prune/preview` | Operator | Preview unused volumes prune + generate token |
| POST | `/volumes/prune` | Operator | Execute volume prune with token |
| GET | `/networks` | Viewer | List networks with driver, scope, containers, in-use |
| DELETE | `/networks/{id}` | Operator | Remove individual network |
| POST | `/networks/prune/preview` | Operator | Preview unused networks prune + generate token |
| POST | `/networks/prune` | Operator | Execute network prune with token |
| GET | `/jobs/{job_id}/stream` | Viewer | SSE stream for image pull job |

---

## 6. Frontend UI (`/resources`)

1. Route: `/resources` (lazy-loaded standalone `ResourcesComponent`).
2. Tabs:
   - **Images**: Tags, ID, Size, Created Age, In-use badge/chips, Protected chip, Delete action, "Pull Image" header button, "Prune Dangling" header button.
   - **Volumes**: Volume Name, Driver, Created, In-use badge/chips, Protected chip, Delete action, "Prune Unused" header button.
   - **Networks**: Network Name, Driver, Scope, Internal flag, Connected containers chips, Protected/Built-in chip, Delete action, "Prune Unused" header button.
3. Unused highlighting:
   - Amber warning pill: "Unused" when `is_in_use == false`.
4. Dialogs:
   - `PruneWizardDialogComponent`:
     - Step 1: Preview items & reclaimable size.
     - Step 2: Confirm action with expiration timer.
     - Step 3: Success summary showing items pruned and bytes freed.
   - `PullImageDialogComponent`:
     - Input field for image name.
     - Pull button.
     - Live monospace terminal showing streaming progress lines and layer states.

---

## 7. Verification & Testing

1. Backend Unit Tests (`backend/tests/test_resources_api.py`, `backend/tests/test_resource_service.py`):
   - In-use detection for images, volumes, and networks.
   - Protected resource removal rejection (400) for configured patterns.
   - Prune preview space and count matching actual prune results.
   - Image pull job and SSE event streaming.
   - Confirmation token expiry and tamper protection.
2. Frontend Unit Tests:
   - `resources.service.spec.ts`, `resources.store.spec.ts`.
   - `resources.component.spec.ts`, `prune-wizard-dialog.component.spec.ts`, `pull-image-dialog.component.spec.ts`.
3. Production Build:
   - `npm run build --prefix frontend` with 0 warnings.
