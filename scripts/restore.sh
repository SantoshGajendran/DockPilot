#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <backup-file.sql.gz | backup-file.sql> [--force]"
    exit 1
fi

BACKUP_FILE="$1"
FORCE="${2:-}"
CONTAINER_NAME="${DB_CONTAINER:-dockpilot-postgres}"
DB_USER="${POSTGRES_USER:-dockpilot}"
DB_NAME="${POSTGRES_DB:-dockpilot}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' not found."
    exit 1
fi

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
    echo "==> Verifying SHA256 checksum..."
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -c "${CHECKSUM_FILE}"
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 -c "${CHECKSUM_FILE}"
    fi
    echo "Checksum verification succeeded."
fi

if [ "${FORCE}" != "--force" ] && [ "${FORCE}" != "-y" ]; then
    read -rp "Are you sure you want to restore '${BACKUP_FILE}' into '${DB_NAME}'? This will overwrite existing data. (y/N): " CONFIRM
    if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
        echo "Restore aborted by user."
        exit 0
    fi
fi

echo "==> Restoring database '${DB_NAME}' from '${BACKUP_FILE}'..."

if [[ "${BACKUP_FILE}" == *.gz ]]; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
else
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${BACKUP_FILE}"
fi

echo "==> Restore completed successfully."
