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

  test('edit associate page loads with pre-filled data', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');
    // Click edit icon (Pencil) in the actions column
    await page.locator('tr:has-text("João da Silva") a[aria-label^="Editar"]').click();
    await expect(page).toHaveURL(/\/app\/associados\/\d+\/editar/);
    await expect(page.locator('h1')).toContainText('Editar associado');
    await expect(page.locator('input[name="fullName"]')).toHaveValue('João da Silva');
    await expect(page.locator('input[name="primaryEmail"]')).toHaveValue('joao@asof.local');
  });

  test('updates associate and redirects to profile', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');
    await page.locator('tr:has-text("João da Silva") a[aria-label^="Editar"]').click();
    await expect(page).toHaveURL(/\/app\/associados\/\d+\/editar/);

    await page.fill('input[name="fullName"]', 'João da Silva Atualizado');
    await page.click('button[type="submit"]');

    // Should redirect to profile page
    await expect(page).toHaveURL(/\/app\/associados\/\d+/);
    await expect(page.locator('body')).toContainText('João da Silva Atualizado');
  });
});
