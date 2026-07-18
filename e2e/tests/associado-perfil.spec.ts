import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';

async function openJoaoProfile(page: Page) {
  await page.goto('/app/associados');
  await page.fill('input[name="q"]', 'João');
  await page.press('input[name="q"]', 'Enter');
  await page
    .locator('li:has-text("João da Silva") a[href^="/app/associados/"]')
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/associados\/\d+(?:\?.*)?$/);
}

async function sectionCount(section: Locator, label: string) {
  const heading = await section.getByRole('heading', { level: 2 }).textContent();
  const match = heading?.match(new RegExp(`^${label} \\((\\d+)\\)$`));
  expect(match, `Contagem ausente no título de ${label}`).not.toBeNull();
  return Number(match![1]);
}

test.describe('Perfil do oficial', () => {
  test('preserva seções em ordem e exibe a mensalidade paga', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await openJoaoProfile(page);

    await expect(page.locator('main h1')).toContainText('João da Silva');

    const expectedSectionIds = [
      'visao-geral',
      'identificacao',
      'endereco',
      'dados-profissionais',
      'administrativo',
      'associacao',
      'mensalidades',
      'dependentes',
      'convenios',
      'observacoes',
      'atividades',
    ];
    const renderedSectionIds = await page
      .locator('main #visao-geral, main section[id]')
      .evaluateAll((sections) => sections.map((section) => section.id));
    expect(renderedSectionIds).toEqual(expectedSectionIds);

    const exactHeadings: Array<[string, string | RegExp]> = [
      ['identificacao', 'Identificação'],
      ['endereco', 'Endereço'],
      ['dados-profissionais', 'Dados Profissionais'],
      ['administrativo', 'Administrativo'],
      ['associacao', /^Associação · Histórico/],
      ['mensalidades', 'Histórico de Mensalidades'],
      ['dependentes', /^Dependentes \(\d+\)$/],
      ['convenios', /^Convênios \(\d+\)$/],
      ['observacoes', 'Observações internas'],
      ['atividades', /^Atividades vinculadas \(\d+\)$/],
    ];
    for (const [id, name] of exactHeadings) {
      await expect(page.locator(`#${id}`).getByRole('heading', { level: 2, name })).toBeVisible();
    }

    const paidJanuary = page.locator('#mensalidades [title="pago"]', { hasText: '01/2026' });
    await expect(paidJanuary).toHaveText('01/2026');
  });

  test('adiciona, renderiza e remove dependente e convênio', async ({
    page,
    loginAsAdmin,
  }, testInfo) => {
    await loginAsAdmin();
    await openJoaoProfile(page);

    const dependentName = `Dependente E2E ${testInfo.retry}`;
    const agreementProvider = `Convênio E2E ${testInfo.retry}`;
    const dependentsSection = page.locator('#dependentes');
    const agreementsSection = page.locator('#convenios');
    const initialDependentCount = await sectionCount(dependentsSection, 'Dependentes');
    const initialAgreementCount = await sectionCount(agreementsSection, 'Convênios');

    await dependentsSection.getByRole('button', { name: 'Adicionar dependente' }).click();
    await dependentsSection.getByLabel('Nome do dependente').fill(dependentName);
    await dependentsSection.getByLabel('Parentesco').fill('filho');
    await dependentsSection.getByRole('button', { name: 'Adicionar', exact: true }).click();

    await expect(dependentsSection.getByRole('heading', { level: 2 })).toHaveText(
      `Dependentes (${initialDependentCount + 1})`,
    );
    await expect(dependentsSection.getByText(dependentName, { exact: true })).toBeVisible();

    await agreementsSection.getByRole('button', { name: 'Adicionar convênio' }).click();
    await agreementsSection.getByLabel('Nome do convênio').fill(agreementProvider);
    await agreementsSection.getByLabel('Data de início').fill('2026-07-01');
    await agreementsSection.getByLabel('Data de fim').fill('2026-07-31');
    await agreementsSection.getByRole('button', { name: 'Adicionar', exact: true }).click();

    await expect(agreementsSection.getByRole('heading', { level: 2 })).toHaveText(
      `Convênios (${initialAgreementCount + 1})`,
    );
    await expect(agreementsSection.getByText(agreementProvider, { exact: true })).toBeVisible();
    await expect(agreementsSection.getByText('01/07/2026 – 31/07/2026')).toBeVisible();

    const dependentRow = dependentsSection.locator('div.group', { hasText: dependentName });
    await dependentRow.hover();
    await dependentRow.getByRole('button', { name: 'Remover dependente' }).click();
    await expect(dependentsSection.getByText(dependentName, { exact: true })).toHaveCount(0);
    await expect(dependentsSection.getByRole('heading', { level: 2 })).toHaveText(
      `Dependentes (${initialDependentCount})`,
    );

    const agreementRow = agreementsSection.locator('div.group', { hasText: agreementProvider });
    await agreementRow.hover();
    await agreementRow.getByRole('button', { name: 'Remover convênio' }).click();
    await expect(agreementsSection.getByText(agreementProvider, { exact: true })).toHaveCount(0);
    await expect(agreementsSection.getByRole('heading', { level: 2 })).toHaveText(
      `Convênios (${initialAgreementCount})`,
    );
  });
});
