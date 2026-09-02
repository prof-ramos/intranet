#!/usr/bin/env bash
# Cloud Agent start phase for the ASOF Intranet.
#
# Runs on every boot. Fresh images and post-snapshot boots both need PostgreSQL
# accepting connections before the agent works. Idempotent: provision scripts
# no-op when packages, role, trust rules, and databases already exist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Fresh Cloud Agent images have no PostgreSQL. Provision (and clear a stale
# postmaster.pid left by environment-build snapshots) before starting it.
bash "$SCRIPT_DIR/provision-postgres.sh"

if ! pg_isready -h localhost -q 2>/dev/null; then
  echo "[cloud-agent] Starting PostgreSQL..."
  sudo service postgresql start
  for _ in $(seq 1 30); do
    if pg_isready -h localhost -q 2>/dev/null; then
      break
    fi
    sleep 1
  done
fi

if ! pg_isready -h localhost -q 2>/dev/null; then
  echo "[cloud-agent] ERROR: PostgreSQL is not accepting connections on localhost:5432" >&2
  exit 1
fi

# Safety net for boots where install did not finish migrate/seed (no node_modules
# means we are still in image-prep; skip rather than fail).
if [[ -f package.json && -d node_modules && -f .env.local ]]; then
  if ! psql -h localhost -d asof_intranet -tAc "SELECT 1 FROM associates LIMIT 1" 2>/dev/null | grep -q 1; then
    echo "[cloud-agent] Applying database migrations..."
    npm run db:migrate
    echo "[cloud-agent] Seeding development database..."
    npm run db:seed:dev
  fi
fi

echo "[cloud-agent] PostgreSQL is ready on localhost:5432"
