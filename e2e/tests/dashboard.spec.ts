import { test, expect } from '../fixtures';

test.describe('Dashboard', () => {
  test('displays metrics for admin', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel da diretoria');
    await expect(page.locator('text=associados ativos')).toBeVisible();
    await expect(page.locator('text=atividades em aberto')).toBeVisible();
    await expect(page.locator('text=Atividades em curso')).toBeVisible();
  });

  test('displays dashboard for diretoria', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel da diretoria');
  });

  test('displays dashboard for secretaria', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel da diretoria');
  });
});
