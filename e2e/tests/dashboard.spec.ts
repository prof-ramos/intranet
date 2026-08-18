import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';

async function expectNavigationSections(page: Page) {
  const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(navigation.locator('[role="group"] > p')).toHaveText([
    'Operação',
    'Cadastro',
    'Gestão',
  ]);
  return navigation;
}

test.describe('Dashboard', () => {
  test('displays metrics for admin', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel Administrativo');
    await expect(page.locator('text=associados ativos')).toBeVisible();
    await expect(page.locator('text=atividades em aberto')).toBeVisible();
    await expect(page.locator('text=Atividades em curso')).toBeVisible();

    const navigation = await expectNavigationSections(page);
    await expect(navigation.getByRole('button', { name: 'Financeiro' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Relatórios' })).toBeVisible();
    await expect(navigation.getByRole('button', { name: 'Configurações' })).toBeVisible();
    await expect(navigation.getByText('E-mails com IA', { exact: true })).toHaveCount(1);
  });

  test('displays dashboard for diretoria', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel Administrativo');

    const navigation = await expectNavigationSections(page);
    await expect(navigation.getByRole('button', { name: 'Financeiro' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Relatórios' })).toBeVisible();
    await expect(navigation.getByRole('button', { name: 'Configurações' })).toBeVisible();
    await expect(navigation.getByText('E-mails com IA', { exact: true })).toHaveCount(0);
  });

  test('displays dashboard for secretaria', async ({ page, loginAsSecretaria }) => {
    await loginAsSecretaria();
    await page.goto('/app');
    await expect(page.locator('h1')).toContainText('Painel Administrativo');

    const navigation = await expectNavigationSections(page);
    await expect(navigation.getByRole('button', { name: 'Financeiro' })).toHaveCount(0);
    await expect(navigation.getByRole('link', { name: 'Relatórios' })).toHaveCount(0);
    await expect(navigation.getByRole('button', { name: 'Configurações' })).toHaveCount(0);
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
    await expect(page.getByText('Embaixada em Paris', { exact: true })).toBeVisible();
    await expect(page.getByText('Consulado em Nova York', { exact: true })).toBeVisible();
    await expect(page.getByText('São Francisco - Consulado-Geral', { exact: true })).toHaveCount(0);

    await page.goto('/app');
    await page.getByRole('link', { name: /associados exterior/i }).click();
    await expect(page).toHaveURL(/associationStatus=associado.*location=exterior/);
    await expect(page.getByText('Embaixada em Paris', { exact: true })).toBeVisible();
    await expect(page.getByText('Consulado em Nova York', { exact: true })).toBeVisible();

    await page.goto('/app');
    await page.getByRole('link', { name: /atividades em aberto/i }).click();
    await expect(page).toHaveURL(/openOnly=1/);
    await expect(page.getByText('Revisar pendência vencida E2E')).toBeVisible();
    await expect(page.getByText('Atividade concluída E2E')).toHaveCount(0);

    await page.goto('/app');
    await page.getByRole('link', { name: /inadimplentes/i }).click();
    await expect(page).toHaveURL(/associationStatus=associado.*contributionStatus=inadimplente/);
  });
});
