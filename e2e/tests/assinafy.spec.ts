import { test, expect } from '../fixtures';

test.describe('Assinafy — Assinatura de Ofícios', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    // Reset mock state between tests for isolation.
    // TODO: When moving to parallel workers (workers > 1), replace globalThis pattern
    // with a Playwright worker-scoped fixture that provides typed access to the mock.
    // The fixture would start/stop the mock per worker and expose reset() via the
    // fixture parameter. This requires solving port allocation (each worker needs its
    // own mock port) and env-var injection before the Next.js dev server starts.
    expect(globalThis.__ASSINAFY_MOCK__, 'Assinafy mock should be defined by globalSetup').toBeDefined();
    globalThis.__ASSINAFY_MOCK__!.reset();

    await loginAsAdmin();
    await page.goto('/app/secretaria/oficios');
    await page.waitForLoadState('networkidle');
  });

  // ---------------------------------------------------------------------------
  // Cenário A — Botão "Enviar para Assinatura"
  // ---------------------------------------------------------------------------
  test.describe('Botão Enviar para Assinatura', () => {
    test('botão visível para ofício gerado', async ({ page }) => {
      const row = page.locator('tr', { hasText: '001/2026-ASOF' });
      await expect(row.locator('button[aria-label="Enviar para assinatura"]')).toBeVisible();
    });

    test('botão visível para ofício rascunho', async ({ page }) => {
      const row = page.locator('tr', { hasText: '003/2026-ASOF' });
      await expect(row.locator('button[aria-label="Enviar para assinatura"]')).toBeVisible();
    });

    test('botão oculto para ofício cancelado', async ({ page }) => {
      const row = page.locator('tr', { hasText: '006/2026-ASOF' });
      await expect(row.locator('button[aria-label="Enviar para assinatura"]')).toHaveCount(0);
    });

    test('botão oculto para ofício já enviado', async ({ page }) => {
      const row = page.locator('tr', { hasText: '004/2026-ASOF' });
      await expect(row.locator('button[aria-label="Enviar para assinatura"]')).toHaveCount(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Cenário B — Modal de Envio
  // ---------------------------------------------------------------------------
  test.describe('Modal de Envio', () => {
    test('modal abre e exibe número do ofício', async ({ page }) => {
      const row = page.locator('tr', { hasText: '001/2026-ASOF' });
      await row.locator('button[aria-label="Enviar para assinatura"]').click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('text=001/2026-ASOF')).toBeVisible();
    });

    test('campo email rejeita entrada inválida', async ({ page }) => {
      const row = page.locator('tr', { hasText: '001/2026-ASOF' });
      await row.locator('button[aria-label="Enviar para assinatura"]').click();

      const modal = page.locator('[role="dialog"]');
      // type="email" may block invalid submission at browser level
      await modal.locator('input[type="email"]').fill('not-an-email');
      await modal.locator('button[type="submit"]').click();

      // Either the modal stays open (browser validation) or shows an error
      await expect(modal).toBeVisible();
    });

    test('fecha ao clicar fora', async ({ page }) => {
      const row = page.locator('tr', { hasText: '001/2026-ASOF' });
      await row.locator('button[aria-label="Enviar para assinatura"]').click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Click outside modal (backdrop)
      await page.mouse.click(10, 10);
      await expect(modal).not.toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Cenário C — Fluxo de Sucesso (com mock)
  // ---------------------------------------------------------------------------
  test.describe('Fluxo de Sucesso', () => {
    test('envio bem-sucedido gera badge de assinatura', async ({ page }) => {
      // Use ofício 003 (rascunho) so that 001 remains untouched for visibility tests
      const row = page.locator('tr', { hasText: '003/2026-ASOF' });
      await row.locator('button[aria-label="Enviar para assinatura"]').click();

      const modal = page.locator('[role="dialog"]');
      await modal.locator('input[type="email"]').fill('signer@example.com');

      // Submit and wait for modal to close
      await modal.locator('button[type="submit"]').click();
      await expect(modal).not.toBeVisible();

      // Badge should appear
      const updatedRow = page.locator('tr', { hasText: '003/2026-ASOF' });
      await expect(updatedRow.locator('a[title="Abrir página de assinatura"]')).toBeVisible();
    });

    test('badge abre em nova aba', async ({ page }) => {
      const row = page.locator('tr', { hasText: '004/2026-ASOF' });
      const badge = row.locator('a[title="Abrir página de assinatura"]');

      await expect(badge).toHaveAttribute('target', '_blank');
      await expect(badge).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ---------------------------------------------------------------------------
  // Cenário D — Badge de Assinatura
  // ---------------------------------------------------------------------------
  test.describe('Badge de Assinatura', () => {
    test('pending_signature mostra badge clickável', async ({ page }) => {
      const row = page.locator('tr', { hasText: '004/2026-ASOF' });
      const badge = row.locator('a[title="Abrir página de assinatura"]');
      await expect(badge).toBeVisible();
    });

    test('certificated mostra label fixo', async ({ page }) => {
      const row = page.locator('tr', { hasText: '005/2026-ASOF' });
      await expect(row.locator('text=Assinado')).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // Cenário F — Permissões de Role
  // ---------------------------------------------------------------------------
  test.describe('Permissões de Role', () => {
    test('secretaria pode enviar para assinatura', async ({ page, loginAsSecretaria }) => {
      await loginAsSecretaria();
      await page.goto('/app/secretaria/oficios');
      await page.waitForLoadState('networkidle');

      const row = page.locator('tr', { hasText: '001/2026-ASOF' });
      await expect(row.locator('button[aria-label="Enviar para assinatura"]')).toBeVisible();
    });

    test('diretoria pode enviar para assinatura', async ({ page, loginAsDiretoria }) => {
      await loginAsDiretoria();
      await page.goto('/app/secretaria/oficios');
      await page.waitForLoadState('networkidle');

      const row = page.locator('tr', { hasText: '001/2026-ASOF' });
      await expect(row.locator('button[aria-label="Enviar para assinatura"]')).toBeVisible();
    });
  });
});
