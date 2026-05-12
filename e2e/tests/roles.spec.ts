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

test.describe('Config routes – admin/diretoria only', () => {
  test('admin can access config page', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/config');
    await expect(page).toHaveURL(/\/app\/config/);
    await expect(page.locator('h1')).toContainText('Configurações');
  });

  test('admin can access usuarios page', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/config/usuarios');
    await expect(page).toHaveURL(/\/app\/config\/usuarios/);
    await expect(page.locator('h1')).toContainText('Usuários');
  });

  test('admin can access auditoria page', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/config/auditoria');
    await expect(page).toHaveURL(/\/app\/config\/auditoria/);
    await expect(page.locator('h1')).toContainText('Auditoria');
  });

  test('admin can access lotacoes page', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/config/lotacoes');
    await expect(page).toHaveURL(/\/app\/config\/lotacoes/);
    await expect(page.locator('h1')).toContainText('Lotações');
  });

  test('diretoria can access config page', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app/config');
    await expect(page).toHaveURL(/\/app\/config/);
  });

  test('secretaria is redirected from config to dashboard', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app/config');
    await expect(page).toHaveURL('/app');
  });

  test('secretaria is redirected from usuarios to dashboard', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app/config/usuarios');
    await expect(page).toHaveURL('/app');
  });

  test('secretaria is redirected from auditoria to dashboard', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app/config/auditoria');
    await expect(page).toHaveURL('/app');
  });

  test('secretaria is redirected from lotacoes to dashboard', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app/config/lotacoes');
    await expect(page).toHaveURL('/app');
  });
});

test.describe('Config sidebar navigation', () => {
  test('admin sees Configurações group with sub-items', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app');
    const configButton = page.getByRole('button', { name: 'Configurações' });
    await expect(configButton).toBeVisible();
    await configButton.click();
    await expect(page.getByRole('link', { name: 'Usuários' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lotações' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Auditoria' })).toBeVisible();
  });

  test('config group auto-expands when navigating to a child route', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/config/usuarios');
    const configButton = page.getByRole('button', { name: 'Configurações' });
    await expect(configButton).toHaveAttribute('aria-expanded', 'true');
  });

  test('secretaria does not see Configurações in sidebar', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app');
    await expect(page.getByRole('button', { name: 'Configurações' })).not.toBeVisible();
  });
});
