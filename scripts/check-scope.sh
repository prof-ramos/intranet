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

if git diff --cached --check --quiet; then
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

