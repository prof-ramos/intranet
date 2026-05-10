import { test, expect } from '../fixtures';

test.describe('Role-based access', () => {
  test('admin can access all routes', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/juridico');
    await expect(page).toHaveURL(/\/app\/juridico/);
    await expect(page.locator('body')).toContainText('Jurídico');
  });

  test('diretoria can access juridico', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app/juridico');
    await expect(page).toHaveURL(/\/app\/juridico/);
  });

  test('secretaria is redirected from juridico to dashboard', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app/juridico');
    await expect(page).toHaveURL('/app');
  });

  test('secretaria can access dashboard', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app');
    await expect(page).toHaveURL('/app');
  });
});
