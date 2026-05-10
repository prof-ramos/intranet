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
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? 'a'.repeat(32),
    },
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
});
