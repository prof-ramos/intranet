#!/bin/bash
set -euo pipefail

TOKENS_FILE="src/lib/ui/tokens.ts"

if [ ! -f "$TOKENS_FILE" ]; then
  echo "Error: $TOKENS_FILE not found" >&2
  exit 1
fi

# POSIX-compatible extraction (no grep -P)
exports=$(grep -E 'export const [A-Za-z_][A-Za-z0-9_]*' "$TOKENS_FILE" | sed -E 's/.*export const ([A-Za-z_][A-Za-z0-9_]*).*/\1/')

if [ -z "$exports" ]; then
  echo "No exported constants found in $TOKENS_FILE"
  exit 0
fi

for exp in $exports; do
  # grep -w for word-boundary match avoids false positives (e.g., "error" in "errorLog")
  count=$(grep -rw "$exp" src/ --include='*.ts' --include='*.tsx' | grep -v "$TOKENS_FILE" | wc -l | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    echo "$exp is unused"
  fi
done
