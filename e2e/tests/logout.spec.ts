import { expect, test } from '../fixtures';

test.describe('Modal de encerramento de sessão', () => {
  test('oferece alvo de toque adequado e permite cancelar', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app');

    await page.getByRole('button', { name: 'Sair', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Encerrar sessão' });
    await expect(dialog).toBeVisible();

    const cancelButton = dialog.getByRole('button', { name: 'Cancelar' });
    await expect(cancelButton).toBeVisible();

    await expect
      .poll(async () => (await cancelButton.boundingBox())?.height ?? 0)
      .toBeGreaterThanOrEqual(44);
    await expect
      .poll(async () => (await cancelButton.boundingBox())?.width ?? 0)
      .toBeGreaterThanOrEqual(44);

    await cancelButton.click();
    await expect(dialog).not.toBeVisible();
  });
});
