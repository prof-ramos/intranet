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
    await expect(page.getByText('Destinatários')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar envio' })).toBeVisible();
  });
});
