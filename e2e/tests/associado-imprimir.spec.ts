import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';

async function openJoaoProfile(page: Page) {
  await page.goto('/app/associados');
  await page.fill('input[name="q"]', 'João');
  await page.press('input[name="q"]', 'Enter');
  await page.locator('li:has-text("João da Silva") a[href^="/app/associados/"]').first().click();
  await expect(page).toHaveURL(/\/app\/associados\/\d+(?:\?.*)?$/);
}

async function openPrintableFicha(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Imprimir ficha' }).click();
  const printPage = await popupPromise;
  await expect(printPage).toHaveURL(/\/app\/associados\/\d+\/imprimir$/);
  return printPage;
}

test.describe('Ficha impressa do Oficial de Chancelaria', () => {
  test('abre pelo perfil sem expor observações internas', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await openJoaoProfile(page);

    const printPage = await openPrintableFicha(page);

    await expect(printPage.getByRole('heading', { name: 'João da Silva' })).toBeVisible();
    await expect(printPage.getByRole('heading', { name: 'Identificação' })).toBeVisible();
    await expect(printPage.getByRole('heading', { name: 'Endereço' })).toBeVisible();
    await expect(printPage.getByRole('heading', { name: 'Observações Internas' })).toHaveCount(0);

    await printPage.getByRole('link', { name: 'Voltar ao perfil' }).click();
    await expect(printPage).toHaveURL(/\/app\/associados\/\d+$/);
  });

  test('oculta navegação e controles na mídia de impressão', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await openJoaoProfile(page);
    const printPage = await openPrintableFicha(page);

    await printPage.emulateMedia({ media: 'print' });
    await expect(printPage.getByRole('link', { name: 'Oficiais' })).toBeHidden();
    await expect(printPage.getByRole('button', { name: 'Imprimir' })).toBeHidden();
  });
});
