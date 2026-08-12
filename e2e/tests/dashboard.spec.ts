import { test, expect } from '../fixtures';

test.describe('Dashboard', () => {
  test('displays metrics for admin', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel Administrativo');
    await expect(page.locator('text=associados ativos')).toBeVisible();
    await expect(page.locator('text=atividades em aberto')).toBeVisible();
    await expect(page.locator('text=Atividades em curso')).toBeVisible();
  });

  test('displays dashboard for diretoria', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel Administrativo');
  });

  test('displays dashboard for secretaria', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel Administrativo');
  });

  test('opens the selected overdue activity from the dispatch strip', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/app');

    await page.getByRole('link', { name: /Revisar pendência vencida E2E/i }).click();

    await expect(page).toHaveURL(/\/app\/atividades\?.*dueLate=1.*open=\d+/);
    await expect(page.getByRole('dialog')).toContainText('Revisar pendência vencida E2E');
  });

  test('indicator links open their corresponding filtered queues', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/app');

    await page.getByRole('link', { name: /associados ativos/i }).click();
    await expect(page).toHaveURL(/associationStatus=associado/);
    await expect(page.getByText('João da Silva', { exact: true })).toBeVisible();
    await expect(page.getByText('Maria Oliveira', { exact: true })).toBeVisible();
    await expect(page.getByText('EDSON MARCOS VALENTE', { exact: true })).toHaveCount(0);

    await page.goto('/app');
    await page.getByRole('link', { name: /associados exterior/i }).click();
    await expect(page).toHaveURL(/associationStatus=associado.*location=exterior/);
    await expect(page.getByText('João da Silva', { exact: true })).toBeVisible();
    await expect(page.getByText('Maria Oliveira', { exact: true })).toBeVisible();

    await page.goto('/app');
    await page.getByRole('link', { name: /atividades em aberto/i }).click();
    await expect(page).toHaveURL(/openOnly=1/);
    await expect(page.getByText('Revisar pendência vencida E2E')).toBeVisible();
    await expect(page.getByText('Atividade concluída E2E')).toHaveCount(0);
  });
});
