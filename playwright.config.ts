import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/smoke-*.spec.ts',
  timeout: 60_000,
  expect: {
    // Defense-in-depth against slow JIT compilation of dynamic routes on cold
    // .next-e2e cache (see e2e/AGENTS.md "E2E Gotchas"). Default is 5s.
    timeout: 30_000,
  },
  fullyParallel: false, // Single DB instance; sequential is safer
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
