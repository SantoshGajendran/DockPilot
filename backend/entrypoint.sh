#!/bin/sh
set -e

echo "Applying database migrations..."
alembic upgrade head || echo "Migration warning: proceeding with startup"

exec "$@"
