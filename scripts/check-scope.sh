#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/check-scope.sh [--strict]

Shows repository scope hygiene and, in --strict mode, fails on local noise or
potentially unsafe staged files.
EOF
}

strict=0
if [[ "${1:-}" == "--strict" ]]; then
  strict=1
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
elif [[ -n "${1:-}" ]]; then
  usage >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

failures=()
snapshot_baseline_index="$(
  node -e '
    const fs = require("node:fs");
    const baseline = JSON.parse(
      fs.readFileSync("drizzle/postgres/snapshot-baseline.json", "utf8"),
    );
    if (!Number.isInteger(baseline.index) || baseline.index < 0) process.exit(1);
    process.stdout.write(String(baseline.index));
  '
)"

add_failure() {
  failures+=("$1")
}

echo "Repository: $repo_root"
echo "Branch: $(git branch --show-current)"
echo

echo "Git status:"
git status --short --branch
echo

if git diff --cached --name-only | grep -Eq '(^|/)(\.env[^/]*|\.vercel/|\.maestri/|\.claude/worktrees/|\.worktrees/)'; then
  add_failure "staged files include environment, Vercel, Maestri, Claude worktree, or git worktree local state"
fi

if git ls-files --others --exclude-standard | grep -Eq '(^|/)(\.env[^/]*|\.vercel/|\.maestri/|\.claude/worktrees/|\.worktrees/|\.omc/)'; then
  add_failure "untracked local/tooling state is not ignored"
fi

if git diff --cached --name-only | grep -Eq '^drizzle/postgres/.*\.sql$'; then
  if ! git diff --cached --name-only | grep -Eq '^drizzle/postgres/meta/_journal\.json$'; then
    add_failure "staged Drizzle SQL migration without drizzle/postgres/meta/_journal.json"
  fi
fi

staged_files="$(git diff --cached --name-only)"
if grep -Eq '^drizzle/postgres/(.*\.sql|meta/_journal\.json)$' <<<"$staged_files"; then
  if grep -Fxq 'drizzle/postgres/meta/_journal.json' <<<"$staged_files"; then
    if latest_snapshot_path="$({
      git show :drizzle/postgres/meta/_journal.json
    } | node -e '
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { input += chunk; });
      process.stdin.on("end", () => {
        const journal = JSON.parse(input);
        const latest = journal.entries?.at(-1);
        if (!Number.isInteger(latest?.idx)) process.exit(1);
        process.stdout.write(
          `${latest.idx}\tdrizzle/postgres/meta/${String(latest.idx).padStart(4, "0")}_snapshot.json`,
        );
      });
    ')"; then
      latest_index="${latest_snapshot_path%%$'\t'*}"
      latest_snapshot="${latest_snapshot_path#*$'\t'}"
      if (( latest_index >= snapshot_baseline_index )) &&
        ! grep -Fxq "$latest_snapshot" <<<"$staged_files"; then
        add_failure "staged Drizzle migration journal without snapshot for latest index ${latest_index}: ${latest_snapshot}"
      fi
    else
      add_failure "staged drizzle/postgres/meta/_journal.json is missing or invalid"
    fi
  fi
fi

if git diff --cached --check >/dev/null; then
  echo "Whitespace check: clean"
else
  add_failure "staged diff has whitespace errors"
fi

echo
echo "Worktrees:"
git worktree list

if [[ "$strict" -eq 1 && "${#failures[@]}" -gt 0 ]]; then
  echo
  echo "Scope check failed:"
  printf ' - %s\n' "${failures[@]}"
  exit 1
fi

if [[ "${#failures[@]}" -gt 0 ]]; then
  echo
  echo "Warnings:"
  printf ' - %s\n' "${failures[@]}"
fi
