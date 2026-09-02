#!/usr/bin/env bash
# Idempotent PostgreSQL bootstrap for Cloud Agent VMs.
# Fresh images do not include the server, client tools, or an `ubuntu` role.
set -euo pipefail

if ! command -v sudo >/dev/null 2>&1; then
  echo "[cloud-agent] ERROR: sudo is required to provision PostgreSQL" >&2
  exit 1
fi

# Environment builds snapshot the disk while PostgreSQL is still running, so a
# later boot inherits a stale postmaster.pid. Remove it when the recorded PID
# is dead so service start / pg_ctlcluster can bring the cluster up.
clear_stale_postmaster_pid() {
  local pidfile stale_pid
  while IFS= read -r pidfile; do
    stale_pid="$(sudo head -n1 "$pidfile" 2>/dev/null || true)"
    if [[ -z "$stale_pid" ]] || ! sudo kill -0 "$stale_pid" 2>/dev/null; then
      echo "[cloud-agent] removing stale postmaster.pid (${pidfile}, pid=${stale_pid:-none})"
      sudo rm -f "$pidfile"
    fi
  done < <(sudo find /var/lib/postgresql -name postmaster.pid 2>/dev/null)
}
clear_stale_postmaster_pid

packages_missing=0
command -v psql >/dev/null 2>&1 || packages_missing=1
command -v pg_isready >/dev/null 2>&1 || packages_missing=1
command -v createdb >/dev/null 2>&1 || packages_missing=1
command -v pg_lsclusters >/dev/null 2>&1 || packages_missing=1
if ! dpkg -s postgresql postgresql-contrib >/dev/null 2>&1; then
  packages_missing=1
fi

if [[ "$packages_missing" -eq 1 ]]; then
  echo "[cloud-agent] Installing PostgreSQL server and client..."
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    postgresql-client
fi

wait_for_socket() {
  local _i
  for _i in $(seq 1 30); do
    if sudo -u postgres psql -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if ! sudo -u postgres psql -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
  echo "[cloud-agent] Starting PostgreSQL to finish provisioning..."
  sudo service postgresql start
  if ! wait_for_socket; then
    echo "[cloud-agent] ERROR: PostgreSQL did not become ready after install" >&2
    exit 1
  fi
fi

role_ok="$(sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'ubuntu' AND rolsuper AND rolcanlogin")"
if [[ "$role_ok" != "1" ]]; then
  echo "[cloud-agent] Creating PostgreSQL role ubuntu..."
  sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ubuntu') THEN
    CREATE ROLE ubuntu SUPERUSER LOGIN;
  ELSE
    ALTER ROLE ubuntu WITH SUPERUSER LOGIN;
  END IF;
END
$$;
SQL
fi

ensure_localhost_trust() {
  local hba="$1"

  if sudo grep -Eq '^host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1/32[[:space:]]+trust' "$hba"; then
    return 0
  fi

  sudo sed -i -E \
    -e 's#^(host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1/32[[:space:]]+)(scram-sha-256|md5)[[:space:]]*$#\1trust#' \
    -e 's#^(host[[:space:]]+all[[:space:]]+all[[:space:]]+::1/128[[:space:]]+)(scram-sha-256|md5)[[:space:]]*$#\1trust#' \
    "$hba"

  if sudo grep -Eq '^host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1/32[[:space:]]+trust' "$hba"; then
    return 0
  fi

  echo "[cloud-agent] Prepending localhost trust rules to $hba"
  local tmp
  tmp="$(mktemp)"
  {
    echo '# asof-cloud-agent-localhost-trust'
    echo 'host    all             all             127.0.0.1/32            trust'
    echo 'host    all             all             ::1/128                 trust'
    echo
    sudo cat "$hba"
  } > "$tmp"
  sudo cp "$tmp" "$hba"
  rm -f "$tmp"
}

hba_files=()
while IFS= read -r hba; do
  hba_files+=("$hba")
done < <(sudo find /etc/postgresql -name pg_hba.conf 2>/dev/null)

if [[ "${#hba_files[@]}" -eq 0 ]]; then
  echo "[cloud-agent] ERROR: no pg_hba.conf found under /etc/postgresql" >&2
  exit 1
fi

hba_changed=0
for hba in "${hba_files[@]}"; do
  if sudo grep -Eq '^host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1/32[[:space:]]+trust' "$hba"; then
    continue
  fi
  ensure_localhost_trust "$hba"
  hba_changed=1
done

if [[ "$hba_changed" -eq 1 ]]; then
  echo "[cloud-agent] Reloading PostgreSQL after pg_hba change..."
  sudo service postgresql reload || sudo service postgresql restart
  if ! wait_for_socket; then
    echo "[cloud-agent] ERROR: PostgreSQL did not become ready after pg_hba reload" >&2
    exit 1
  fi
fi

if ! pg_isready -h localhost -q; then
  echo "[cloud-agent] ERROR: PostgreSQL is not accepting TCP connections on localhost:5432" >&2
  exit 1
fi

if ! psql -h localhost -d postgres -tAc 'SELECT current_user' | grep -qx ubuntu; then
  echo "[cloud-agent] ERROR: TCP login as ubuntu@localhost failed" >&2
  exit 1
fi

for db in asof_intranet asof_intranet_test asof_test; do
  if ! psql -h localhost -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -qx 1; then
    echo "[cloud-agent] Creating database ${db}..."
    createdb -h localhost "$db"
  fi
done

echo "[cloud-agent] PostgreSQL is provisioned for postgres://ubuntu@localhost:5432/asof_intranet"
