import { test, expect } from '../fixtures';

test.describe('Juridico', () => {
  test('dashboard loads for admin', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/juridico');
    await expect(page.locator('h1')).toContainText('Jurídico');
    await expect(page.locator('text=Consultas abertas')).toBeVisible();
    await expect(page.getByLabel('Indicadores').getByText('Aguardando escritório')).toBeVisible();
    await expect(page.locator('text=Ações pendentes')).toBeVisible();
  });

  test('dashboard loads for diretoria', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app/juridico');
    await expect(page.locator('h1')).toContainText('Jurídico');
  });

  test('new consultation page loads', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/juridico/consultas/nova');
    await expect(page.locator('h1')).toContainText('Nova consulta');
    await expect(page.locator('input[name="title"]')).toBeVisible();
  });

  test('consultation list page loads', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/juridico/consultas');
    await expect(page.locator('h1')).toContainText('Consultas');
  });
});
