import { test, expect } from '../fixtures';

test.describe('Secretaria — Ofícios', () => {
  test('page loads and lists seeded ofícios', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await expect(page.locator('h1')).toContainText('Ofícios');
    await expect(page.locator('table')).toContainText('OFÍCIO No 001/2026/ASOF');
    await expect(page.locator('table')).toContainText('OFÍCIO No 002/2026/ASOF');
    await expect(page.locator('table')).toContainText('Ministro das Relações Exteriores');
    await expect(page.locator('table')).toContainText('Secretário-Geral');
  });

  test('search input is present', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
  });

  test('ofício status badge is visible', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await expect(page.locator('text=gerado').first()).toBeVisible();
  });

  test('edit link navigates to edit page', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await page.getByRole('link', { name: 'Editar' }).first().click();
    await expect(page).toHaveURL(/\/app\/secretaria\/oficios\/\d+\/editar/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Editar Ofício');
  });

  test('download link is present for generated ofícios', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    const downloadLink = page.locator('tr:has-text("OFÍCIO No 001/2026/ASOF") a[title="Download PDF"]');
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('href', /\/api\/oficios\/\d+\/download/);
  });

  test('cancel button is present for generated ofícios', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    const cancelButton = page.locator('tr:has-text("OFÍCIO No 001/2026/ASOF") button[title="Cancelar"]');
    await expect(cancelButton).toBeVisible();
  });

  test('create new ofício form loads', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await page.click('text=Novo Ofício');
    await expect(page).toHaveURL('/app/secretaria/oficios/novo', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Gerar Novo Ofício');
    await expect(page.locator('input[name="recipient"]')).toBeVisible();
    await expect(page.locator('input[name="subject"]')).toBeVisible();
    await expect(page.locator('textarea[name="bodyPlainText"]')).toBeVisible();
  });

  test('diretoria can access secretaria', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app/secretaria/oficios');
    await expect(page.locator('h1')).toContainText('Ofícios');
  });

  test('secretaria can access secretaria', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app/secretaria/oficios');
    await expect(page.locator('h1')).toContainText('Ofícios');
  });
});
