import { test, expect } from '../fixtures';

test.describe('Cadastro de Oficiais', () => {
  test('lists seeded associates after search', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');
    await expect(page.locator('h1')).toContainText('Oficiais');

    // The new design requires a search query (≥ 3 chars) to show results.
    await page.fill('input[name="q"]', 'João');
    await page.press('input[name="q"]', 'Enter');

    await expect(page.locator('main ul')).toContainText('João da Silva');
  });

  test('search filters by name', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');

    await page.fill('input[name="q"]', 'João');
    await page.press('input[name="q"]', 'Enter');

    await expect(page.locator('main ul')).toContainText('João da Silva');
    await expect(page.locator('main ul')).not.toContainText('Maria Oliveira');
  });

  test('navigates to associate profile', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');

    await page.fill('input[name="q"]', 'João');
    await page.press('input[name="q"]', 'Enter');

    // Cards link directly to the profile page.
    await page.locator('li:has-text("João da Silva") a[href^="/app/associados/"]').first().click();
    await expect(page).toHaveURL(/\/app\/associados\/\d+/);
    await expect(page.locator('main h1')).toContainText('João da Silva');
  });

  test('edit associate page loads with pre-filled data', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');

    // Search to reveal results (new design requires an active query).
    await page.fill('input[name="q"]', 'João');
    await page.press('input[name="q"]', 'Enter');

    // Navigate to profile first — the listing no longer has a direct edit link.
    await page.locator('li:has-text("João da Silva") a[href^="/app/associados/"]').first().click();
    await expect(page).toHaveURL(/\/app\/associados\/\d+/);

    // The "Editar dados" button lives in the profile header — always visible,
    // no hover required (EditLink has no opacity-0 class).
    await page.locator('a[href*="/editar"]').first().click();
    await expect(page).toHaveURL(/\/app\/associados\/\d+\/editar/);

    // h1 was renamed in the redesign from "Editar associado" → "Editar oficial".
    await expect(page.locator('h1')).toContainText('Editar oficial');
    await expect(page.locator('input[name="fullName"]')).toHaveValue('João da Silva');
    await expect(page.locator('input[name="primaryEmail"]')).toHaveValue('joao@asof.local');
  });

  test('updates associate and redirects to profile', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/associados');

    await page.fill('input[name="q"]', 'João');
    await page.press('input[name="q"]', 'Enter');

    await page.locator('li:has-text("João da Silva") a[href^="/app/associados/"]').first().click();
    await expect(page).toHaveURL(/\/app\/associados\/\d+/);

    await page.locator('a[href*="/editar"]').first().click();
    await expect(page).toHaveURL(/\/app\/associados\/\d+\/editar/);

    await page.fill('input[name="fullName"]', 'João da Silva Atualizado');
    await page.click('button[type="submit"]');

    // Should redirect to profile page
    await expect(page).toHaveURL(/\/app\/associados\/\d+/);
    await expect(page.locator('main h1')).toContainText('João da Silva Atualizado');
  });
});
