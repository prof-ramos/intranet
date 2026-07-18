import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config para smoke test de produção.
 * Sem global-setup/teardown — aponta direto para o ambiente live.
 *
 * Vars de ambiente:
 *   SMOKE_BASE_URL       (padrão: https://intranet.asof.com.br)
 *   SMOKE_ADMIN_EMAIL    (obrigatório)
 *   SMOKE_ADMIN_PASSWORD (obrigatório)
 *   SMOKE_EXPECTED_COMMIT_SHA (SHA completo obrigatório)
 *   SMOKE_ALLOW_MUTATIONS (padrão false)
 *   SMOKE_RUN_ID (obrigatório quando mutações=true)
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/smoke-prod.spec.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'smoke-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.SMOKE_BASE_URL ?? 'https://intranet.asof.com.br',
    trace: 'on',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
