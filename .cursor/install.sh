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

# CPF/SIAPE search uses blind indexes. Without a local key the list page throws.
if ! grep -q '^ENCRYPTION_MASTER_KEY=' .env.local; then
  echo "[cloud-agent] Setting ENCRYPTION_MASTER_KEY for local identity search..."
  if grep -q '^# ENCRYPTION_MASTER_KEY=' .env.local; then
    sed -i 's|^# ENCRYPTION_MASTER_KEY=.*|ENCRYPTION_MASTER_KEY=cloud-agent-dev-encryption-master-key-32|' .env.local
  else
    printf '\nENCRYPTION_MASTER_KEY=cloud-agent-dev-encryption-master-key-32\n' >> .env.local
  fi
fi

echo "[cloud-agent] Install complete."
