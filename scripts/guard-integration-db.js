#!/usr/bin/env node
// Prevents test:integration from running DML against non-local databases.
// CI passes because it sets DATABASE_URL to localhost. Developers with a
// staging URL in .env.local are blocked unless they opt in explicitly.
const url = process.env.DATABASE_URL ?? '';
const isLocal =
  url.includes('localhost') ||
  url.includes('127.0.0.1') ||
  url.includes('asof_test');
const override = process.env.INTEGRATION_TESTS_ALLOW_REMOTE === 'true';

if (!isLocal && !override) {
  console.error(
    '\x1b[31m[test:integration] BLOCKED: DATABASE_URL does not look like a local database.\n' +
      'This script performs real INSERT/UPSERT/DELETE against email_triagens.\n' +
      'Point DATABASE_URL to a local postgres instance, or set:\n' +
      '  INTEGRATION_TESTS_ALLOW_REMOTE=true npm run test:integration\x1b[0m',
  );
  process.exit(1);
}
