#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

is_positive_integer() {
  case "${1:-}" in
    '' | *[!0-9]*) return 1 ;;
    *) [ "$1" -gt 0 ] ;;
  esac
}

sha256_file() {
  local file="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file"
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file"
    return
  fi

  fail "Required command not found: sha256sum or shasum"
}

DRY_RUN="${DRY_RUN:-false}"
BACKUP_DIR="${BACKUP_DIR:-/opt/intranet-backup}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

[ "${DATABASE_BACKUP_URL:-}" ] || fail "DATABASE_BACKUP_URL must be set outside Git."
is_positive_integer "$RETENTION_DAYS" || fail "RETENTION_DAYS must be a positive integer."

case "$BACKUP_DIR" in
  /*) ;;
  *) fail "BACKUP_DIR must be an absolute path." ;;
esac

case "$BACKUP_DIR" in
  / | /tmp | /var | /opt | /Users | /home) fail "BACKUP_DIR is too broad: $BACKUP_DIR" ;;
esac

require_command pg_dump
require_command gzip
require_command find
require_command mktemp

if [ "$DRY_RUN" = "true" ]; then
  log "DRY_RUN=true; would create backup directory if needed: $BACKUP_DIR"
  log "DRY_RUN=true; would run pg_dump using DATABASE_BACKUP_URL without printing it"
  log "DRY_RUN=true; would gzip, validate gzip -t, write SHA256, and retain $RETENTION_DAYS days"
  exit 0
fi

umask 077
mkdir -p "$BACKUP_DIR"

[ -d "$BACKUP_DIR" ] || fail "BACKUP_DIR is not a directory."
[ ! -L "$BACKUP_DIR" ] || fail "BACKUP_DIR must not be a symlink."

backup_dir_real="$(cd "$BACKUP_DIR" && pwd -P)"
case "$backup_dir_real" in
  / | /tmp | /var | /opt | /Users | /home) fail "Resolved BACKUP_DIR is too broad: $backup_dir_real" ;;
esac

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
backup_base="asof-intranet-${timestamp}.sql.gz"
backup_path="${backup_dir_real}/${backup_base}"
tmp_path="$(mktemp "${backup_dir_real}/.${backup_base}.tmp.XXXXXX")"

cleanup_tmp() {
  rm -f "$tmp_path"
}
trap cleanup_tmp EXIT

log "Starting Neon/PostgreSQL Level 1 backup into ${backup_dir_real}/${backup_base}"

pg_dump --no-owner --no-privileges --format=plain --dbname="$DATABASE_BACKUP_URL" | gzip -c >"$tmp_path"
gzip -t "$tmp_path"
mv "$tmp_path" "$backup_path"
trap - EXIT

(
  cd "$backup_dir_real"
  sha256_file "$backup_base" >"${backup_base}.sha256"
)

backup_size="$(wc -c <"$backup_path" | tr -d ' ')"
log "Backup complete: ${backup_base} (${backup_size} bytes)"
log "Checksum complete: ${backup_base}.sha256"

log "Applying retention: deleting backup artifacts older than ${RETENTION_DAYS} days in ${backup_dir_real}"
find "$backup_dir_real" -maxdepth 1 -type f \
  \( -name 'asof-intranet-*.sql.gz' -o -name 'asof-intranet-*.sql.gz.sha256' \) \
  -mtime +"$RETENTION_DAYS" -print -delete

log "Backup validation complete: gzip -t passed and SHA256 was written"
