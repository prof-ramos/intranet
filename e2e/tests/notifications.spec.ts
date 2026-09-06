import { expect, test } from '../fixtures';

test.describe('NotificationBell', () => {
  test('abre o painel in-app a partir do layout autenticado', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app');

    const bell = page.getByTestId('notification-bell');
    await expect(bell).toBeVisible();
    await bell.click();

    const dialog = page.getByRole('dialog', { name: 'Painel de notificações' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Notificações', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Nenhuma notificação encontrada.')).toBeVisible();
  });
});
