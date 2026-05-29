#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  DATABASE_BACKUP_URL=postgres://... scripts/backup-neon-level1.sh

Environment:
  DATABASE_BACKUP_URL  Required for real runs. Direct PostgreSQL URL dedicated to backups.
  BACKUP_DIR           Backup directory. Default: /opt/intranet-backup
  RETENTION_DAYS       Positive number of days to keep backup files. Default: 14
  DRY_RUN              true/1/yes prints planned actions without running pg_dump.

The script writes a compressed plain SQL dump, validates it with gzip -t,
writes a SHA256 checksum, and prunes only matching backup files inside BACKUP_DIR.
EOF
}

log() {
  printf '[backup-neon-level1] %s\n' "$*"
}

fail() {
  printf '[backup-neon-level1] ERROR: %s\n' "$*" >&2
  exit 1
}

is_true() {
  case "${1:-}" in
    true | TRUE | 1 | yes | YES) return 0 ;;
    *) return 1 ;;
  esac
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

resolve_dir() {
  local dir="$1"
  mkdir -p "$dir"
  (cd "$dir" && pwd -P)
}

validate_retention_days() {
  local value="$1"
  [[ "$value" =~ ^[0-9]+$ ]] || fail "RETENTION_DAYS must be a positive integer."
  [[ "$value" -ge 1 ]] || fail "RETENTION_DAYS must be at least 1."
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

umask 077

backup_dir="${BACKUP_DIR:-/opt/intranet-backup}"
retention_days="${RETENTION_DAYS:-14}"
dry_run="${DRY_RUN:-false}"

validate_retention_days "$retention_days"

require_command gzip
if command -v sha256sum >/dev/null 2>&1; then
  checksum_command=(sha256sum)
else
  require_command shasum
  checksum_command=(shasum -a 256)
fi

if ! is_true "$dry_run"; then
  [[ -n "${DATABASE_BACKUP_URL:-}" ]] || fail "DATABASE_BACKUP_URL must be set for real backup runs."
  require_command pg_dump
fi

backup_root="$(resolve_dir "$backup_dir")"
[[ -n "$backup_root" && "$backup_root" != "/" ]] || fail "Refusing unsafe BACKUP_DIR: $backup_root"
[[ -d "$backup_root" ]] || fail "BACKUP_DIR is not a directory: $backup_root"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_name="asof-intranet-${timestamp}.sql.gz"
backup_path="${backup_root}/${backup_name}"
tmp_path="${backup_path}.tmp"
checksum_path="${backup_path}.sha256"

cleanup_tmp() {
  rm -f "$tmp_path"
}
trap cleanup_tmp EXIT

log "Backup directory: $backup_root"
log "Retention days: $retention_days"
log "Output file: $backup_name"

if is_true "$dry_run"; then
  log "DRY_RUN=true: would run pg_dump, gzip validation, checksum generation, and retention pruning."
else
  log "Starting pg_dump backup without printing connection details."
  pg_dump --no-owner --no-privileges --format=plain --dbname="$DATABASE_BACKUP_URL" | gzip -9 > "$tmp_path"
  gzip -t "$tmp_path"
  
  backup_size="$(wc -c <"$tmp_path" | tr -d ' ')"
  log "Backup complete: ${backup_name} (${backup_size} bytes)"
  
  mv "$tmp_path" "$backup_path"
  (
    cd "$backup_root"
    "${checksum_command[@]}" "$backup_name" > "$(basename "$checksum_path")"
  )
  log "Backup completed and gzip/checksum validation passed."
fi

if [[ "$retention_days" -gt 0 ]]; then
  log "Pruning backup files older than ${retention_days} days inside $backup_root."
  if is_true "$dry_run"; then
    find "$backup_root" -maxdepth 1 -type f \
      \( -name 'asof-intranet-*.sql.gz' -o -name 'asof-intranet-*.sql.gz.sha256' \) \
      -mtime +"$retention_days" -print
  else
    find "$backup_root" -maxdepth 1 -type f \
      \( -name 'asof-intranet-*.sql.gz' -o -name 'asof-intranet-*.sql.gz.sha256' \) \
      -mtime +"$retention_days" -print -delete
  fi
fi

log "Done."
