import { test, expect } from '../fixtures';
import { like } from 'drizzle-orm';
import { mailingCampaigns } from '@/lib/db/schema';
import { db } from '../helpers/db';

test.describe('Mala direta — campanhas', () => {
  test.afterEach(async () => {
    await db.delete(mailingCampaigns).where(like(mailingCampaigns.name, 'E2E campanha%'));
  });

  test('lista campanhas e cria rascunho de e-mail com preview', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/mala-direta');
    await expect(page.getByRole('heading', { name: 'Mala direta' })).toBeVisible();
    await page.getByRole('link', { name: 'Nova campanha' }).click();
    await expect(page.getByRole('heading', { name: 'Nova campanha' })).toBeVisible();

    await page.getByLabel('Nome da campanha').fill('E2E campanha assembleia');
    await page.getByLabel('Assunto do e-mail').fill('Convite assembleia E2E');
    await expect(page.getByText(/destinatário/)).toBeVisible();

    await page.getByRole('button', { name: 'Criar campanha de e-mail' }).click();
    await expect(page).toHaveURL(/\/app\/mala-direta\/\d+$/);
    await expect(page.getByRole('heading', { name: 'E2E campanha assembleia' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Nome' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar envio' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByText('Cancelada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar envio' })).toHaveCount(0);
  });

  test('cria folha de etiquetas e baixa CSV do público filtrado', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/app/mala-direta/nova');
    await expect(page.getByRole('heading', { name: 'Nova campanha' })).toBeVisible();

    await page.getByLabel('Etiquetas (impressão postal)').check();
    await page.getByLabel('Nome da campanha').fill('E2E campanha etiquetas');
    await expect(page.getByText(/destinatário/)).toBeVisible();

    await page.getByRole('button', { name: 'Criar folha de etiquetas' }).click();
    await expect(page).toHaveURL(/\/app\/mala-direta\/\d+$/);
    await expect(page.getByRole('heading', { name: 'E2E campanha etiquetas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Baixar PDF (Pimaco 6182)' })).toBeVisible();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/etiquetas/csv') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Baixar CSV' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
    const csv = await response.text();
    expect(csv).toContain('nome');
    expect(csv.split(/\r?\n/).length).toBeGreaterThan(1);
  });
});
