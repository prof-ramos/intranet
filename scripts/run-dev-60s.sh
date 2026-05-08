#!/usr/bin/env bash
set -euo pipefail

duration="${DURATION_SECONDS:-60}"
port="${PORT:-3000}"
host="${HOST:-127.0.0.1}"
log_file="${LOG_FILE:-next-dev-60s.log}"
dev_pid=""

fail() {
  echo "error: $*" >&2
  exit 1
}

[[ "$duration" =~ ^[0-9]+$ ]] || fail "DURATION_SECONDS must be a positive integer"
(( duration >= 1 && duration <= 3600 )) || fail "DURATION_SECONDS must be between 1 and 3600"
[[ "$port" =~ ^[0-9]+$ ]] || fail "PORT must be an integer"
(( port >= 1 && port <= 65535 )) || fail "PORT must be between 1 and 65535"
[[ "$host" =~ ^[A-Za-z0-9._-]+$ ]] || fail "HOST contains unsupported characters"
[[ -n "$log_file" && "$log_file" != /* && "$log_file" != *..* && "$log_file" != */* ]] || fail "LOG_FILE must be a relative filename without path traversal"

kill_tree() {
  local signal="$1"
  local pid="$2"
  local children

  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for child in $children; do
    kill_tree "$signal" "$child"
  done

  kill "-$signal" "$pid" 2>/dev/null || true
}

cleanup() {
  if [[ -n "${dev_pid:-}" ]] && kill -0 "$dev_pid" 2>/dev/null; then
    echo "== Stopping process tree =="
    kill_tree TERM "$dev_pid"
    sleep 2
    if kill -0 "$dev_pid" 2>/dev/null; then
      echo "== Force killing process tree =="
      kill_tree KILL "$dev_pid"
    fi
  fi
}

trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --use-on-cd --shell bash)"
  fnm use lts-latest >/dev/null 2>&1 || true
fi

for required_cli in node npm curl; do
  command -v "$required_cli" >/dev/null 2>&1 || fail "$required_cli is required but not installed"
done

rm -f "$log_file"

echo "== Environment =="
echo "node: $(node --version 2>/dev/null || echo unavailable)"
echo "npm: $(npm --version 2>/dev/null || echo unavailable)"
echo "host: $host"
echo "port: $port"
echo "duration: ${duration}s"
echo "log: $log_file"

npm run dev -- -p "$port" -H "$host" >"$log_file" 2>&1 &
dev_pid="$!"

echo "== Started =="
echo "pid: $dev_pid"

for second in $(seq 1 "$duration"); do
  if ! kill -0 "$dev_pid" 2>/dev/null; then
    echo "== Dev process exited before timeout at ${second}s =="
    break
  fi

  if (( second % 10 == 0 )); then
    echo "== Snapshot ${second}s =="
    ps -o pid,ppid,%cpu,%mem,rss,command -p "$dev_pid" 2>/dev/null || true
    children="$(pgrep -P "$dev_pid" 2>/dev/null || true)"
    if [[ -n "$children" ]]; then
      ps -o pid,ppid,%cpu,%mem,rss,command -p "$(echo "$children" | paste -sd, -)" 2>/dev/null || true
    fi
    if ! curl --max-time 2 -fsS -o /dev/null -w "http_status=%{http_code}\n" "http://${host}:${port}/"; then
      echo "http_status=unavailable"
    fi
  fi

  sleep 1
done

echo "== Log tail before shutdown =="
tail -120 "$log_file" 2>/dev/null || true

cleanup

wait "$dev_pid" 2>/dev/null || true
dev_pid=""

echo "== Remaining matching processes =="
ps aux | grep -E "(next dev|npm run dev|node .*next)" | grep -v grep || echo "none"
