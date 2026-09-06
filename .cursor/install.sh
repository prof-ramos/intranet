#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "[cloud-agent] Provisioning PostgreSQL..."
bash "$SCRIPT_DIR/provision-postgres.sh"

echo "[cloud-agent] Installing npm dependencies..."
npm ci

if [[ ! -f .env.local ]]; then
  echo "[cloud-agent] Creating .env.local from .env.example..."
  cp .env.example .env.local
  sed -i \
    -e 's|postgres://<user>@localhost:5432/asof_intranet|postgres://ubuntu@localhost:5432/asof_intranet|g' \
    -e 's|SESSION_SECRET=change-me-with-at-least-32-characters|SESSION_SECRET=cloud-agent-dev-session-secret-32chars|g' \
    .env.local
fi

bash "$SCRIPT_DIR/ensure-dev-env.sh"

echo "[cloud-agent] Install complete."
