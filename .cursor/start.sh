#!/usr/bin/env bash
# Cloud Agent start phase for the ASOF Intranet.
#
# Runs on every boot. Ensures the local PostgreSQL cluster (provisioned and
# seeded during .cursor/install.sh) is running before the agent works. Idempotent
# and safe to run when the cluster is already up.
set -euo pipefail

PG_VERSION=16

sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true

for _ in $(seq 1 30); do
  pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
  sleep 1
done

pg_isready -h localhost -p 5432
echo "[start] PostgreSQL ${PG_VERSION} is ready on localhost:5432"
