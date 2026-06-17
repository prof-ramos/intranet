import { test as base, type Page } from '@playwright/test';
import { E2E_USERS } from './constants';

export interface TestUser {
  email: string;
  password: string;
}

export const e2eUsers: Record<string, TestUser> = E2E_USERS;

async function loginAs(page: Page, user: TestUser, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto('/login');
    // Wait for potential auth redirects to complete
    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});
    if (page.url().includes('/app')) {
      return;
    }
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to either /app (success) or /login?error (failure)
    await page.waitForURL(/\/(app|login)/, { timeout: 15000 });

    if (page.url().includes('/app')) {
      return;
    }

    // Login failed (redirected to /login?error=...), retry after a brief pause
    if (attempt < maxAttempts) {
      await page.waitForTimeout(500 * attempt);
    }
  }

  // Final attempt — let waitForURL throw if it still fails
  await page.goto('/login');
  // Wait for potential auth redirects to complete
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});
  if (page.url().includes('/app')) {
    return;
  }
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/app', { timeout: 15000 });
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
