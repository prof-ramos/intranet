#!/bin/bash
exports=$(grep -oP 'export const \K\w+' src/lib/ui/tokens.ts)
for exp in $exports; do
  count=$(grep -rn "$exp" src/ | grep -v "src/lib/ui/tokens.ts" | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "$exp is unused"
  fi
done
