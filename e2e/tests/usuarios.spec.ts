import { test, expect } from '../fixtures';

test.describe('Admin User Management & Password Reset Flow', () => {
  test("admin can request a password reset without seeing credentials", async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin();
    await page.goto('/app/config/usuarios');
    await expect(page).toHaveURL(/\/app\/config\/usuarios/);
    await expect(page.locator('h1')).toContainText('Usuários');

    const row = page.locator('tr', { hasText: 'Secretaria E2E' });
    await expect(row).toBeVisible();

    const resetBtn = row.getByRole('button', { name: 'Resetar senha' });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    const confirmPrompt = row.locator('text=Confirmar reset para Secretaria E2E?');
    await expect(confirmPrompt).toBeVisible();

    const confirmBtn = row.getByRole('button', { name: 'Confirmar' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(row.getByRole('alert').or(row.getByRole('status'))).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('temp-password-value')).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Ver credenciais resetadas' })).toHaveCount(0);
  });
});
