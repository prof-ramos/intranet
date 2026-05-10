import { test, expect } from '../fixtures';

test.describe('Associados', () => {
  test('lists seeded associates', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');
    await expect(page.locator('h1')).toContainText('Associados');
    await expect(page.locator('table')).toContainText('João da Silva');
    await expect(page.locator('table')).toContainText('Maria Oliveira');
  });

  test('search filters by name', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');
    await page.fill('input[name="q"]', 'João');
    await page.press('input[name="q"]', 'Enter');
    await expect(page.locator('table')).toContainText('João da Silva');
    await expect(page.locator('table')).not.toContainText('Maria Oliveira');
  });

  test('navigates to associate profile', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');
    await page.click('text=João da Silva');
    await expect(page).toHaveURL(/\/app\/associados\/\d+/);
    await expect(page.locator('body')).toContainText('João da Silva');
  });
});
