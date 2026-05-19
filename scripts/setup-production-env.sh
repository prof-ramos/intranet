#!/usr/bin/env bash
# setup-production-env.sh
# Run this script to add missing production env vars to Vercel.
# It will prompt for values that need manual input (Mailjet keys).
# Auto-generated values are created fresh each run.

set -euo pipefail

echo "=== Setting up missing production env vars ==="
echo ""

# Auto-generated values (fresh each run)
ENCRYPTION_KEY=$(openssl rand -hex 32)
CRON=$(openssl rand -hex 32)

echo "Adding ENCRYPTION_MASTER_KEY..."
echo "$ENCRYPTION_KEY" | vercel env add ENCRYPTION_MASTER_KEY production

echo "Adding CRON_SECRET..."
echo "$CRON" | vercel env add CRON_SECRET production

echo "Adding TRUSTED_PROXY_COUNT..."
echo "1" | vercel env add TRUSTED_PROXY_COUNT production

echo ""
echo "=== Manual values needed ==="
echo ""
echo "Add MAILJET_API_KEY from https://app.mailjet.com/account/api_keys"
vercel env add MAILJET_API_KEY production

echo "Add MAILJET_SECRET_KEY from https://app.mailjet.com/account/api_keys"
vercel env add MAILJET_SECRET_KEY production

echo ""
echo "=== Done! Verifying... ==="
vercel env ls 2>&1 | grep -i "ENCRYPTION_MASTER_KEY\|CRON_SECRET\|TRUSTED_PROXY_COUNT\|MAILJET"

echo ""
echo "Also add these to Preview and Development environments if needed:"
echo "  vercel env add ENCRYPTION_MASTER_KEY preview"
echo "  vercel env add ENCRYPTION_MASTER_KEY development"
echo "  (repeat for each var)"