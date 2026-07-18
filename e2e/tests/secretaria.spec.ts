import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { eq, like } from 'drizzle-orm';
import { oficios } from '@/lib/db/schema';
import { closeDb, db } from '../helpers/db';

const SEEDED_OFICIO_NUMBER = 'Ofício nº 001/2026-ASOF';
const SEEDED_SUBJECT = 'Solicitação de dados funcionais';
const SEEDED_BODY = 'Solicitamos a lista atualizada de associados lotados na Embaixada em Paris.';
const CREATE_SUBJECT = 'E2E OficioForm — criação persistida';
const EDITED_SUBJECT = 'E2E OficioForm — edição persistida';

async function resetOficioFormFixtures() {
  await db.delete(oficios).where(like(oficios.subject, 'E2E OficioForm%'));
  await db
    .update(oficios)
    .set({
      recipient: 'Ministro das Relações Exteriores',
      recipientRole: 'Ministro de Estado',
      vocativo: 'Senhor Ministro',
      subject: SEEDED_SUBJECT,
      itamaratySector: 'SGPR / SGP',
      signatoryName: 'Presidente da ASOF',
      signatoryRole: 'Presidente',
      closure: 'Atenciosamente,',
      bodyRichText: SEEDED_BODY,
      bodyPlainText: SEEDED_BODY,
    })
    .where(eq(oficios.number, SEEDED_OFICIO_NUMBER));
}

async function fillRequiredOficioFields(page: Page, subject: string, body: string) {
  await page.getByLabel('Nome do Destinatário').fill('Diretora do Departamento Consular');
  await page.getByLabel('Cargo', { exact: true }).fill('Diretora');
  await page.getByLabel('Vocativo').fill('Senhora Diretora');
  await page.getByLabel('Setor Itamaraty').fill('DCON');
  await page.getByLabel('Assunto').fill(subject);
  await page.getByLabel('Nome do Signatário').fill('Presidente da ASOF');
  await page.getByLabel('Cargo do Signatário').fill('Presidente');
  await page.getByLabel('Corpo do ofício').fill(body);
}

test.describe('Secretaria — Ofícios', () => {
  test('page loads and lists seeded ofícios', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await expect(page.locator('h1')).toContainText('Ofícios');
    await expect(page.locator('table')).toContainText('Ofício nº 001/2026-ASOF');
    await expect(page.locator('table')).toContainText('Ofício nº 002/2026-ASOF');
    await expect(page.locator('table')).toContainText('Ministro das Relações Exteriores');
    await expect(page.locator('table')).toContainText('Secretário-Geral');
  });

  test('search input is present', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await expect(page.getByRole('textbox', { name: 'Buscar ofícios' })).toBeVisible();
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
    await expect(page).toHaveURL(/\/app\/secretaria\/oficios\/\d+\/editar/);
    await expect(page.locator('h1')).toContainText('Editar Ofício');
  });

  test('download link is present for generated ofícios', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    const downloadLink = page.locator(
      'tr:has-text("Ofício nº 001/2026-ASOF") a[title="Download PDF"]',
    );
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('href', /\/api\/oficios\/\d+\/download/);
  });

  test('cancel button is present for generated ofícios', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    const cancelButton = page
      .locator('tr:has-text("Ofício nº 001/2026-ASOF")')
      .getByRole('button', { name: 'Cancelar ofício' });
    await expect(cancelButton).toBeVisible();
  });

  test('create new ofício form loads', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await page.click('text=Novo Ofício');
    await expect(page).toHaveURL('/app/secretaria/oficios/novo');
    await expect(page.locator('h1')).toContainText('Gerar Novo Ofício');
    await expect(page.locator('input[name="recipient"]')).toBeVisible();
    await expect(page.locator('input[name="subject"]')).toBeVisible();
    await expect(page.locator('[aria-label="Corpo do ofício"]')).toBeVisible();
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

test.describe('Secretaria — regressões do OficioForm', () => {
  test.beforeEach(async () => {
    await resetOficioFormFixtures();
  });

  test.afterAll(async () => {
    await resetOficioFormFixtures();
    await closeDb();
  });

  test('valida campos obrigatórios, cria e mantém o ofício após recarregar a lista', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios/novo');

    await page.getByRole('button', { name: 'Salvar Ofício' }).click();
    await expect(page.getByText('O destinatário é obrigatório.', { exact: true })).toBeVisible();
    await expect(page.getByText('O corpo do ofício é obrigatório.').first()).toBeVisible();

    const body = 'Solicitamos atualização cadastral para a rotina consular.';
    await fillRequiredOficioFields(page, CREATE_SUBJECT, body);
    await page.getByRole('button', { name: 'Salvar Ofício' }).click();

    await expect(page).toHaveURL('/app/secretaria/oficios');
    await expect(page.getByText(CREATE_SUBJECT, { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText(CREATE_SUBJECT, { exact: true })).toBeVisible();
  });

  test('preserva o prefill, atualiza e reabre o ofício com os novos valores', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');

    const seededRow = page.locator('tr').filter({ hasText: SEEDED_OFICIO_NUMBER });
    await seededRow.getByRole('link', { name: 'Editar' }).click();

    await expect(page.getByLabel('Nome do Destinatário')).toHaveValue(
      'Ministro das Relações Exteriores',
    );
    await expect(page.getByLabel('Assunto')).toHaveValue(SEEDED_SUBJECT);
    await expect(page.getByLabel('Corpo do ofício')).toContainText(SEEDED_BODY);

    const editedBody = 'Conteúdo atualizado pelo fluxo E2E do formulário de ofício.';
    await page.getByLabel('Assunto').fill(EDITED_SUBJECT);
    await page.getByLabel('Fecho').selectOption('Respeitosamente,');
    await page.getByLabel('Corpo do ofício').fill(editedBody);
    await page.getByRole('button', { name: 'Atualizar Ofício' }).click();

    await expect(page).toHaveURL('/app/secretaria/oficios');
    const updatedRow = page.locator('tr').filter({ hasText: SEEDED_OFICIO_NUMBER });
    await expect(updatedRow).toContainText(EDITED_SUBJECT);
    await updatedRow.getByRole('link', { name: 'Editar' }).click();

    await expect(page.getByLabel('Assunto')).toHaveValue(EDITED_SUBJECT);
    await expect(page.getByLabel('Fecho')).toHaveValue('Respeitosamente,');
    await expect(page.getByLabel('Corpo do ofício')).toContainText(editedBody);
  });

  test('fecha o modal IA por Escape, botão e backdrop sem perder os campos do formulário', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios/novo');

    const recipient = page.getByLabel('Nome do Destinatário');
    const subject = page.getByLabel('Assunto');
    const editor = page.getByLabel('Corpo do ofício');
    const body = 'Corpo preservado ao abrir e fechar o auxiliar com IA.';
    await recipient.fill('Embaixadora Teste');
    await subject.fill('Assunto preservado no modal');
    await editor.fill(body);

    const openModal = page.getByRole('button', { name: 'Auxiliar com IA' });

    await openModal.click();
    const instruction = page.getByRole('textbox', { name: 'Instrução para a IA' });
    await expect(instruction).toHaveValue(body);
    await instruction.fill('Instrução temporária descartada');
    await instruction.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Auxiliar com IA' })).toBeHidden();

    await openModal.click();
    await expect(instruction).toHaveValue(body);
    await page.getByRole('dialog', { name: 'Auxiliar com IA' }).getByRole('button', {
      name: 'Cancelar',
    }).click();
    await expect(page.getByRole('dialog', { name: 'Auxiliar com IA' })).toBeHidden();

    await openModal.click();
    await expect(instruction).toHaveValue(body);
    await page.mouse.click(5, 5);
    await expect(page.getByRole('dialog', { name: 'Auxiliar com IA' })).toBeHidden();

    await expect(recipient).toHaveValue('Embaixadora Teste');
    await expect(subject).toHaveValue('Assunto preservado no modal');
    await expect(editor).toContainText(body);
  });
});
