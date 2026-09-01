#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

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

if ! psql -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'asof_intranet'" | grep -q 1; then
  echo "[cloud-agent] Creating database asof_intranet..."
  createdb -h localhost asof_intranet
fi

if [[ -f package.json && -d node_modules ]]; then
  echo "[cloud-agent] Applying database migrations..."
  npm run db:migrate

  if ! psql -h localhost -d asof_intranet -tAc "SELECT 1 FROM associates LIMIT 1" 2>/dev/null | grep -q 1; then
    echo "[cloud-agent] Seeding development database..."
    npm run db:seed:dev
  else
    echo "[cloud-agent] Database already seeded; skipping db:seed:dev."
  fi
fi

echo "[cloud-agent] Start complete."
