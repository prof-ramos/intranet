#!/usr/bin/env bash
# Cloud Agent start phase for the ASOF Intranet.
#
# Runs on every boot. Ensures the local PostgreSQL cluster (provisioned and
# seeded during .cursor/install.sh) is running before the agent works. Idempotent
# and safe to run when the cluster is already up.
#
# An environment build snapshots the disk while PostgreSQL is still running, so a
# fresh boot inherits a stale postmaster.pid pointing at a PID that no longer
# exists. Clean that up first so pg_ctlcluster can start cleanly.
set -euo pipefail

PG_VERSION=16
PGDATA="/var/lib/postgresql/${PG_VERSION}/main"
PIDFILE="${PGDATA}/postmaster.pid"

if [ -f "$PIDFILE" ]; then
  stale_pid="$(head -n1 "$PIDFILE" 2>/dev/null || true)"
  if [ -z "$stale_pid" ] || ! sudo kill -0 "$stale_pid" 2>/dev/null; then
    echo "[start] removing stale postmaster.pid (pid=${stale_pid:-none})"
    sudo rm -f "$PIDFILE"
  fi
fi

sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true

for _ in $(seq 1 30); do
  pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
  sleep 1
done

pg_isready -h localhost -p 5432
echo "[start] PostgreSQL ${PG_VERSION} is ready on localhost:5432"
