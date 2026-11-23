# DockPilot Operational Runbook

Single-node production operations guide for DockPilot.

---

## 1. Service Lifecycle

### Start All Services
```bash
docker compose up -d
```

### Check Service Health & Status
```bash
docker compose ps
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:8000/version
```

### View Live Logs
```bash
docker compose logs -f --tail=100 backend
docker compose logs -f --tail=100 socket-proxy
```

### Stop Services Gracefully
```bash
docker compose stop
```

---

## 2. Telemetry & Monitoring

DockPilot exposes Prometheus metrics on `/metrics`:
```bash
curl -s http://127.0.0.1:8000/metrics
```

### Recommended Scrape Configuration (Prometheus)
```yaml
scrape_configs:
  - job_name: "dockpilot"
    static_configs:
      - targets: ["127.0.0.1:8000"]
    metrics_path: "/metrics"
    scrape_interval: 15s
```

### Key Metrics
- `dockpilot_http_requests_total`: Request throughput and status code distribution.
- `dockpilot_http_request_duration_seconds`: API latency profile.
- `dockpilot_monitored_containers_total`: Monitored container health count by status.
- `dockpilot_active_sessions_total`: Active terminal sessions.
- `dockpilot_active_alerts_total`: Firing alert count.

---

## 3. Database Backup & Disaster Recovery

### Manual Backup
```bash
# Linux / macOS
./scripts/backup.sh

# Windows (PowerShell)
.\scripts\backup.ps1
```
Backups are created in `./backups/` with an accompanying `.sha256` checksum.

### Restore Database
```bash
# Linux / macOS
./scripts/restore.sh ./backups/dockpilot_YYYYMMDD_HHMMSS.sql.gz

# Windows (PowerShell)
.\scripts\restore.ps1 -BackupFile .\backups\dockpilot_YYYYMMDD_HHMMSS.sql
```

---

## 4. Emergency Procedures

### 4.1 Emergency Admin Password Reset
If the administrator is locked out or credentials are lost, reset the password directly:
```bash
docker exec -it dockpilot-backend python -c "
import asyncio
from app.core.database import async_session
from app.core.security import hash_password
from app.models.user import User
from sqlalchemy import select

async def reset():
    async with async_session() as session:
        user = (await session.execute(select(User).where(User.username == 'admin'))).scalar_one_or_none()
        if user:
            user.hashed_password = hash_password('new_emergency_password_here')
            user.failed_login_attempts = 0
            user.locked_until = None
            await session.commit()
            print('Admin password reset successful.')
        else:
            print('Admin user not found.')

asyncio.run(reset())
"
```

### 4.2 Rotating JWT & Database Secrets
1. Stop running containers:
   ```bash
   docker compose down
   ```
2. Update `JWT_SECRET` and `POSTGRES_PASSWORD` in your production environment file (`.env`).
3. If changing the Postgres database password, update the Postgres user password inside PostgreSQL:
   ```bash
   docker compose up -d postgres
   docker exec -it dockpilot-postgres psql -U dockpilot -c "ALTER USER dockpilot WITH PASSWORD 'new_password';"
   ```
4. Restart all services:
   ```bash
   docker compose up -d
   ```

### 4.3 Socket Proxy Recovery
If backend reports `Docker gateway collection failed` or `403 Forbidden`:
1. Check socket permissions:
   ```bash
   ls -la /var/run/docker.sock
   ```
2. Verify `tecnativa/docker-socket-proxy` container is running:
   ```bash
   docker compose logs socket-proxy
   ```
3. Restart socket-proxy:
   ```bash
   docker compose restart socket-proxy
   ```

---

## 5. Intranet Hosting (`http://saazvat/dockpilot`)

When another service (such as `teamlink-frontend`) occupies host port 80, DockPilot can be served under `http://saazvat/dockpilot` by reverse-proxying from the port 80 service to DockPilot on port 4200.

### Step 1: Start DockPilot
DockPilot frontend binds to `0.0.0.0:4200:80`:
```bash
docker compose up -d
```

### Step 2: Configure Existing Port 80 Reverse Proxy (`teamlink-frontend`)
Add the following location block into `teamlink-frontend`'s Nginx configuration (e.g. `/etc/nginx/conf.d/default.conf` or equivalent):

```nginx
location /dockpilot/ {
    proxy_pass http://172.17.0.1:4200/dockpilot/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 24h;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Step 3: Test and Reload Port 80 Nginx
```bash
docker exec -it teamlink-frontend nginx -t
docker exec -it teamlink-frontend nginx -s reload
```

Clients across the intranet can now access DockPilot directly at:
```
http://saazvat/dockpilot
```

