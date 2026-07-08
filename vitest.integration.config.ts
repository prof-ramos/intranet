import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres',
      ENCRYPTION_MASTER_KEY:
        process.env.ENCRYPTION_MASTER_KEY ?? 'test-encryption-master-key-at-least-32-chars',
      SESSION_SECRET: process.env.SESSION_SECRET ?? 'a'.repeat(32),
    },
    testTimeout: 15000,
    include: ['src/**/*.integration.test.{ts,tsx}'],
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
});
