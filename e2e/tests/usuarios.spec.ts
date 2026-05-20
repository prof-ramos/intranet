import { test, expect } from '../fixtures';

test.describe('Admin User Management & Password Reset Flow', () => {
  test('admin can reset another user\'s password and copy the generated credentials', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await page.goto('/app/config/usuarios');
    await expect(page).toHaveURL(/\/app\/config\/usuarios/);
    await expect(page.locator('h1')).toContainText('Usuários');

    // Locate the row for "Secretaria E2E"
    const row = page.locator('tr', { hasText: 'Secretaria E2E' });
    await expect(row).toBeVisible();

    // Click on the "Resetar senha" button in that row
    const resetBtn = row.getByRole('button', { name: 'Resetar senha' });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Verify confirmation prompt appears
    const confirmPrompt = row.locator('text=Confirmar reset para Secretaria E2E?');
    await expect(confirmPrompt).toBeVisible();

    // Click "Confirmar" to trigger server action
    const confirmBtn = row.getByRole('button', { name: 'Confirmar' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Wait for the modal dialog to open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toContainText('Credenciais de Acesso Resetadas');

    // Assert that the credentials are listed
    const alertBox = modal.locator('text=Estas credenciais só serão exibidas');
    await expect(alertBox).toBeVisible();

    // Verify temporary password field exists and has value
    const tempPassLabel = modal.locator('text=Senha Temporária');
    await expect(tempPassLabel).toBeVisible();
    const tempPassValue = modal.getByTestId('temp-password-value');
    await expect(tempPassValue).not.toBeEmpty();

    // Verify reset link field exists and has value
    const resetLinkLabel = modal.locator('text=Link de Recuperação (Supabase)');
    await expect(resetLinkLabel).toBeVisible();
    const resetLinkValue = modal.getByTestId('reset-link-value');
    await expect(resetLinkValue).not.toBeEmpty();

    // Click "Concluído" to close the modal
    const doneBtn = modal.getByRole('button', { name: 'Concluído' });
    await expect(doneBtn).toBeVisible();
    await doneBtn.click();

    // Verify modal is closed
    await expect(modal).not.toBeVisible();

    // Verify that the table row now shows the "Ver credenciais resetadas" link button
    const viewCredsBtn = row.getByRole('button', { name: 'Ver credenciais resetadas' });
    await expect(viewCredsBtn).toBeVisible();

    // Click on "Ver credenciais resetadas" to reopen the modal
    await viewCredsBtn.click();
    await expect(modal).toBeVisible();

    // Close using header close X button
    const closeBtn = modal.getByRole('button', { name: 'Fechar' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
