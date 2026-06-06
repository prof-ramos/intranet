#!/usr/bin/env node
// Prevents test:integration from running DML against non-local databases.
// CI passes because it sets DATABASE_URL to localhost. Developers with a
// staging URL in .env.local are blocked unless they opt in explicitly.
const raw = process.env.DATABASE_URL ?? '';
const override = process.env.INTEGRATION_TESTS_ALLOW_REMOTE === 'true';

let hostname = '';
try {
  hostname = new URL(raw).hostname;
} catch {
  // unparseable URL — treat as unsafe
}

const isLocal =
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

if (!isLocal && !override) {
  console.error(
    '\x1b[31m[test:integration] BLOCKED: DATABASE_URL host is not localhost.\n' +
      'This script performs real INSERT/UPSERT/DELETE against email_triagens.\n' +
      'Point DATABASE_URL to a local postgres instance, or set:\n' +
      '  INTEGRATION_TESTS_ALLOW_REMOTE=true npm run test:integration\x1b[0m',
  );
  process.exit(1);
}
