import { test, expect } from '../fixtures';

test.describe('Financeiro — Mensalidades', () => {
  test('page loads with KPIs for admin', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page.locator('h1')).toContainText('Controle de Mensalidades');
    await expect(page.locator('text=Total Associados')).toBeVisible();
    await expect(page.locator('text=Pagos')).toBeVisible();
    await expect(page.locator('text=Pendentes')).toBeVisible();
  });

  test('shows active associates with payment data', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page.locator('table')).toContainText('João da Silva');
    await expect(page.locator('table')).toContainText('Maria Oliveira');
    // Edson is inativo, should not appear in the finance list
    await expect(page.locator('table')).not.toContainText('EDSON MARCOS VALENTE');
  });

  test('search filters by name', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await page.fill('input[placeholder="Buscar por nome..."]', 'João');
    await expect(page.locator('table')).toContainText('João da Silva');
    await expect(page.locator('table')).not.toContainText('Maria Oliveira');
  });

  test('status filter shows correct payments', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');

    // Filter by "Pago" — only João should remain
    await page.getByRole('button', { name: 'Pago' }).first().click();
    await expect(page.locator('table')).toContainText('João da Silva');
    await expect(page.locator('table')).not.toContainText('Maria Oliveira');

    // Reset filter
    await page.getByRole('button', { name: 'Todos' }).first().click();
    await expect(page.locator('table')).toContainText('Maria Oliveira');

    // Filter by "Pendente" — only Maria should remain
    await page.getByRole('button', { name: 'Pendente' }).first().click();
    await expect(page.locator('table')).toContainText('Maria Oliveira');
    await expect(page.locator('table')).not.toContainText('João da Silva');
  });

  test('method filter shows correct payments', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');

    // Filter by "Folha" — only João should remain
    await page.getByRole('button', { name: 'Folha' }).click();
    await expect(page.locator('table')).toContainText('João da Silva');
    await expect(page.locator('table')).not.toContainText('Maria Oliveira');

    // Filter by "Boleto" — only Maria should remain
    await page.getByRole('button', { name: 'Boleto' }).click();
    await expect(page.locator('table')).toContainText('Maria Oliveira');
    await expect(page.locator('table')).not.toContainText('João da Silva');
  });

  test('location filter shows correct payments', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');

    // Both João (Paris) and Maria (NY) are exterior; filter by Brasil should show none
    await page.getByRole('button', { name: 'Brasil' }).click();
    await expect(page.locator('table')).not.toContainText('João da Silva');
    await expect(page.locator('table')).not.toContainText('Maria Oliveira');
    await expect(page.locator('text=Nenhum associado encontrado')).toBeVisible();

    // Filter by Exterior — both should show
    await page.getByRole('button', { name: 'Exterior' }).click();
    await expect(page.locator('table')).toContainText('João da Silva');
    await expect(page.locator('table')).toContainText('Maria Oliveira');
  });

  test('month navigation updates the view', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page.getByText('Janeiro de 2026').first()).toBeVisible();

    await page.getByLabel('Próximo mês').click();
    await expect(page).toHaveURL(/year=2026&month=2/);
    await expect(page.getByText('Fevereiro de 2026').first()).toBeVisible();

    await page.getByLabel('Mês anterior').click();
    await expect(page).toHaveURL(/year=2026&month=1/);
    await expect(page.getByText('Janeiro de 2026').first()).toBeVisible();
  });

  test('shows initialize month banner for unseeded month', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/financeiro/mensalidades?year=2025&month=12');
    await expect(page.locator('text=Mês não inicializado')).toBeVisible();
    await expect(page.locator('button:has-text("Inicializar Mês")')).toBeVisible();
  });

  test('diretoria can access financeiro', async ({ page, loginAsDiretoria }) => {
    await loginAsDiretoria();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page.locator('h1')).toContainText('Controle de Mensalidades');
  });

  test('secretaria is redirected from financeiro to dashboard', async ({
    page,
    loginAsSecretaria,
  }) => {
    await loginAsSecretaria();
    await page.goto('/app/financeiro/mensalidades?year=2026&month=1');
    await expect(page).toHaveURL('/app');
  });
});
