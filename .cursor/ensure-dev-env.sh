#!/usr/bin/env bash
# Idempotent local env fixes for Cloud Agent VMs. Safe to run from install and start.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  exit 0
fi

# CPF/SIAPE search uses blind indexes. Without a local key the list page throws.
if ! grep -q '^ENCRYPTION_MASTER_KEY=' "$ENV_FILE"; then
  echo "[cloud-agent] Setting ENCRYPTION_MASTER_KEY for local identity search..."
  if grep -q '^# ENCRYPTION_MASTER_KEY=' "$ENV_FILE"; then
    sed -i 's|^# ENCRYPTION_MASTER_KEY=.*|ENCRYPTION_MASTER_KEY=cloud-agent-dev-encryption-master-key-32|' "$ENV_FILE"
  else
    printf '\nENCRYPTION_MASTER_KEY=cloud-agent-dev-encryption-master-key-32\n' >> "$ENV_FILE"
  fi
fi
