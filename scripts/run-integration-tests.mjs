#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envFile = path.resolve(process.cwd(), '.env.test.local');

if (!existsSync(envFile)) {
  console.warn('[test:integration] .env.test.local not found — skipping DML tests (see README)');
  process.exit(0);
}

const commands = [
  [path.join(projectRoot, 'scripts/guard-integration-db.js')],
  [
    path.join(projectRoot, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    path.join(projectRoot, 'vitest.integration.config.ts'),
    // The dedicated database is shared by the 13 suites. Individual tests
    // still exercise concurrency explicitly; serializing files prevents
    // unrelated fixture cleanup/row-lock tests from blocking each other.
    '--maxWorkers=1',
  ],
];

for (const args of commands) {
  const result = spawnSync(process.execPath, [`--env-file=${envFile}`, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
