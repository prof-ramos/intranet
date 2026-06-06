// Vitest setupFile: blocks DML integration tests against non-local databases.
// Runs inside each test worker (after vitest.integration.config.ts applies
// its DATABASE_URL fallback), so process.env.DATABASE_URL is always set.
const raw = process.env.DATABASE_URL ?? '';
const override = process.env.INTEGRATION_TESTS_ALLOW_REMOTE === 'true';

let hostname = '';
try {
  hostname = new URL(raw).hostname;
} catch {
  // unparseable — treat as unsafe
}

const isLocal =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname === '::1';

if (!isLocal && !override) {
  throw new Error(
    `[test:integration] DATABASE_URL host "${hostname}" is not localhost.\n` +
      'These integration tests perform real DML. Set INTEGRATION_TESTS_ALLOW_REMOTE=true to override.',
  );
}
