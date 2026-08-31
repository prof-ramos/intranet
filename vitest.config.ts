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
      SESSION_SECRET: process.env.SESSION_SECRET ?? 'a'.repeat(32),
    },
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    reporters: ['default'],
    // jsdom + Next/React renders routinely exceed Vitest's 5s default when the
    // suite is CPU-contended (parallel workers). Integration tests already use 15s.
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.integration.test.*',
        'src/**/*.d.ts',
        'scripts/**',
        'e2e/**',
      ],
      // functions floor matches measured baseline ~71% (2026-07-09).
      // Ratchet toward 75% as modules gain tests; do not set CI gate above reality.
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      'server-only': path.resolve(dirname, './src/__mocks__/server-only.ts'),
    },
  },
});
