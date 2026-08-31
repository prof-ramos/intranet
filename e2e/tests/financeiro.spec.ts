import { test, expect } from '../fixtures';

test.describe('Financeiro e triagem — UI congelada para V2', () => {
  test('admin is redirected from mensalidades to the dashboard', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page).toHaveURL('/app');
    await expect(page.locator('h1')).toContainText('Painel Administrativo');
  });

  test('diretoria is redirected from mensalidades to the dashboard', async ({
    page,
    loginAsDiretoria,
  }) => {
    await loginAsDiretoria();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page).toHaveURL('/app');
  });

  test('secretaria is redirected from financeiro to dashboard', async ({
    page,
    loginAsSecretaria,
  }) => {
    await loginAsSecretaria();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page).toHaveURL('/app');
  });

  test('email triage list and detail redirect to the dashboard', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/email-triage');
    await expect(page).toHaveURL('/app');
    await page.goto('/app/email-triage/1');
    await expect(page).toHaveURL('/app');
  });
});
