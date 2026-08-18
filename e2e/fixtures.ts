import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { E2E_AUTH_STATE_DIR, E2E_USERS, type E2EAuthRole } from './constants';

export interface TestUser {
  email: string;
  password: string;
}

export const e2eUsers: Record<string, TestUser> = E2E_USERS;

type AuthStorageState = {
  cookies?: Parameters<BrowserContext['addCookies']>[0];
};

function authStatePath(role: E2EAuthRole) {
  return path.resolve(process.cwd(), E2E_AUTH_STATE_DIR, `${role}.json`);
}

function readAuthCookies(role: E2EAuthRole) {
  const statePath = authStatePath(role);
  if (!existsSync(statePath)) {
    throw new Error(`E2E auth state is missing for role "${role}": ${statePath}`);
  }

  let state: AuthStorageState;
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8')) as AuthStorageState;
  } catch (error) {
    throw new Error(`E2E auth state is invalid for role "${role}": ${statePath}`, {
      cause: error,
    });
  }

  if (!state.cookies?.length) {
    throw new Error(`E2E auth state has no cookies for role "${role}": ${statePath}`);
  }

  return state.cookies;
}

async function loginWithPassword(page: Page, user: TestUser, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto('/login');
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

async function loginAs(page: Page, user: TestUser, role: E2EAuthRole) {
  const context = page.context();
  await context.clearCookies();
  await context.addCookies(readAuthCookies(role));
  await page.goto('/app');

  if (page.url().includes('/app')) {
    return;
  }

  // A test may have invalidated a user's sessionVersion (for example, the
  // password-reset E2E). Preserve the old helper's recovery behavior without
  // paying the bcrypt/login cost on the normal path.
  await context.clearCookies();
  await loginWithPassword(page, user);
}

export const test = base.extend<{
  loginAsAdmin: () => Promise<void>;
  loginAsDiretoria: () => Promise<void>;
  loginAsSecretaria: () => Promise<void>;
}>({
  loginAsAdmin: async ({ page }, provide) => {
    await provide(() => loginAs(page, e2eUsers.admin, 'admin'));
  },
  loginAsDiretoria: async ({ page }, provide) => {
    await provide(() => loginAs(page, e2eUsers.diretoria, 'diretoria'));
  },
  loginAsSecretaria: async ({ page }, provide) => {
    await provide(() => loginAs(page, e2eUsers.secretaria, 'secretaria'));
  },
});

export { expect } from '@playwright/test';
