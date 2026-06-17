import { test, expect } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from '../constants';

test.describe('Login', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('ASOF');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('logs in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', E2E_ADMIN_EMAIL);
    await page.fill('input[name="password"]', E2E_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/app');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', E2E_ADMIN_EMAIL);
    await page.fill('input[name="password"]', 'wrong-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/login?error=1');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Email ou senha inválidos.' }),
    ).toHaveText('Email ou senha inválidos.');
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL('/login');
    await expect(page.locator('h1')).toHaveText('ASOF');
  });
});
