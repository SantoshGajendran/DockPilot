#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${DB_CONTAINER:-dockpilot-postgres}"
DB_USER="${POSTGRES_USER:-dockpilot}"
DB_NAME="${POSTGRES_DB:-dockpilot}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dockpilot_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "==> Starting DockPilot database backup..."
echo "Container: ${CONTAINER_NAME}"
echo "Database:  ${DB_NAME}"
echo "Target:    ${BACKUP_FILE}"

docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"

if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
fi

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "==> Backup completed successfully (${BACKUP_SIZE})"
echo "Artifact: ${BACKUP_FILE}"
if [ -f "${CHECKSUM_FILE}" ]; then
    echo "Checksum: ${CHECKSUM_FILE}"
fi
