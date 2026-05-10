import { test as base, type Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
}

export const e2eUsers: Record<string, TestUser> = {
  admin: { email: 'e2e-admin@asof.local', password: 'Senha-Forte-2026!' },
  diretoria: { email: 'e2e-diretoria@asof.local', password: 'Senha-Forte-2026!' },
  secretaria: { email: 'e2e-secretaria@asof.local', password: 'Senha-Forte-2026!' },
};

async function loginAs(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/app');
}

export const test = base.extend<{
  loginAsAdmin: () => Promise<void>;
  loginAsDiretoria: () => Promise<void>;
  loginAsSecretaria: () => Promise<void>;
}>({
  loginAsAdmin: async ({ page }, provide) => {
    await provide(() => loginAs(page, e2eUsers.admin));
  },
  loginAsDiretoria: async ({ page }, provide) => {
    await provide(() => loginAs(page, e2eUsers.diretoria));
  },
  loginAsSecretaria: async ({ page }, provide) => {
    await provide(() => loginAs(page, e2eUsers.secretaria));
  },
});

export { expect } from '@playwright/test';
