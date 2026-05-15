#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

scripts/check-scope.sh --strict

if [[ -n "$(git status --porcelain)" ]]; then
  echo
  echo "PR check failed: working tree is not clean."
  git status --short
  exit 1
fi

npm run typecheck
npm run lint
npm run test
npm run test:db
npm run build

