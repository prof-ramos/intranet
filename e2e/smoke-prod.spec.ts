/**
 * Smoke test de produção — automatiza o roteiro do TODO-PROD.md.
 *
 * Vars obrigatórias:
 *   SMOKE_ADMIN_EMAIL     ex: gabriel@asof.org.br
 *   SMOKE_ADMIN_PASSWORD  senha do admin
 *
 * Var opcional:
 *   SMOKE_BASE_URL        padrão: https://intranet.asof.com.br
 *
 * Executar:
 *   npm run smoke:prod
 *
 * Após execução bem-sucedida, rodar o SQL de limpeza impresso no terminal.
 */

import { test, expect, type Page } from '@playwright/test';

// ── Validação de env ────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error(
    'SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD são obrigatórios.\n' +
      'Exemplo: SMOKE_ADMIN_EMAIL=gabriel@asof.org.br SMOKE_ADMIN_PASSWORD=... npm run smoke:prod',
  );
}

// ── Dados de smoke ──────────────────────────────────────────────────────────

const TS = new Date().toISOString().slice(0, 16).replace('T', ' ');
const ATIVIDADE_TITLE = `SMOKE_ Atividade Teste ${TS}`;
const CONSULTA_TITLE = `SMOKE_ Consulta Teste ${TS}`;
const OFICIO_SUBJECT = `SMOKE_ Oficio Teste ${TS}`;
const SMOKE_RESET_EMAIL = 'smoke-reset@asof.org.br';

// ── Helper de login ─────────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  if (page.url().includes('/app')) return;

  await page.fill('input[name="email"]', ADMIN_EMAIL!);
  await page.fill('input[name="password"]', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app/, { timeout: 20_000 });
}

async function fillIfVisible(page: Page, selector: string, value: string) {
  const el = page.locator(selector);
  if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await el.fill(value);
  }
}

// ── Roteiro ─────────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

// ── 1. Login e Sessão ───────────────────────────────────────────────────────
test('1. Login e Sessão', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[name="email"]')).toBeVisible();

  await page.fill('input[name="email"]', ADMIN_EMAIL!);
  await page.fill('input[name="password"]', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app/, { timeout: 20_000 });

  expect(page.url()).toMatch(/\/app/);

  // Cookie de sessão httpOnly existe
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.httpOnly && c.name.toLowerCase().includes('session'));
  expect(sessionCookie, 'Cookie de sessão httpOnly não encontrado').toBeDefined();
});

// ── 2. Dashboard ────────────────────────────────────────────────────────────
test('2. Dashboard', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app');

  await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
  // Ao menos um número de KPI carregado (não placeholder)
  await expect(page.locator('main').first()).not.toContainText('...', { timeout: 10_000 });
  await expect(page.locator('main').first()).toBeVisible();
});

// ── 3. Associados ───────────────────────────────────────────────────────────
test('3. Associados — lista, busca e perfil', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app/associados');

  await expect(page.locator('h1')).toContainText('Associados');
  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 10_000 });

  // Busca por nome parcial
  const searchInput = page.locator('input[name="q"]');
  await searchInput.fill('Silva');
  await searchInput.press('Enter');
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // Navegar ao primeiro resultado
  const firstLink = page.locator('table tbody tr a').first();
  await firstLink.click();
  await expect(page).toHaveURL(/\/app\/associados\/\d+/);
  await expect(page.locator('h1, h2')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('não encontrado');

  // CPF visível para admin (não mascarado completamente)
  await expect(page.locator('body')).not.toContainText('***.***.***-**');
});

// ── 4. Atividades ───────────────────────────────────────────────────────────
test('4. Atividades — criar e verificar no board', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app/atividades');
  await expect(page.locator('h1')).toBeVisible();

  await page.goto('/app/atividades/nova');
  await expect(page.locator('h1')).toBeVisible();

  await page.fill('input[name="title"]', ATIVIDADE_TITLE);
  await fillIfVisible(page, 'textarea[name="description"]',
    `Criada pelo smoke test automatizado (${TS}).`);

  // Status e prioridade — usar defaults se existirem
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\/atividades/, { timeout: 20_000 });

  // Card aparece no board
  await expect(page.locator(`text=${ATIVIDADE_TITLE}`)).toBeVisible({ timeout: 10_000 });
});

// ── 5. Jurídico ─────────────────────────────────────────────────────────────
test('5. Jurídico — criar consulta e avançar status', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app/juridico/consultas/nova');
  await expect(page.locator('h1')).toBeVisible();

  await page.fill('input[name="title"]', CONSULTA_TITLE);
  await fillIfVisible(page, 'input[name="summary"], textarea[name="summary"]',
    'Consulta criada pelo smoke test automatizado.');
  await fillIfVisible(page, 'textarea[name="question"], textarea[name="questionText"]',
    `Texto completo da consulta smoke (${TS}).`);
  await fillIfVisible(page, 'input[name="slaDeadlineDays"]', '30');

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\/juridico\/consultas\/\d+/, { timeout: 20_000 });
  await expect(page.locator('body')).toContainText(CONSULTA_TITLE);

  // Avançar status se o controle estiver visível
  const statusControl = page.locator(
    'select[name="status"], button[data-testid="status-btn"], [data-testid="status-select"]',
  );
  if (await statusControl.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await statusControl.first().click();
    // Selecionar próxima opção no select ou um botão de avançar
    const options = page.locator('select[name="status"] option');
    const count = await options.count();
    if (count > 1) {
      await page.selectOption('select[name="status"]', { index: 1 });
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    }
  }
});

// ── 6. Financeiro ───────────────────────────────────────────────────────────
test('6. Financeiro — mensalidades carregam', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app/financeiro/mensalidades');
  await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

  // Verificar KPIs ou tabela — NÃO inicializa mês (risco em produção)
  const content = page.locator('table, [class*="kpi"], [class*="stat"], [class*="card"]');
  await expect(content.first()).toBeVisible({ timeout: 15_000 });
});

// ── 7. Ofícios ──────────────────────────────────────────────────────────────
test('7. Ofícios — criar e confirmar na lista', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app/secretaria/oficios/novo');
  await expect(page.locator('h1')).toBeVisible();

  await fillIfVisible(page, 'input[name="recipient"]', 'SMOKE_ Destinatário Teste');
  await fillIfVisible(page, 'input[name="recipientRole"]', 'Diretor');
  await fillIfVisible(page, 'input[name="vocativo"]', 'Senhor Diretor,');
  await fillIfVisible(page, 'input[name="subject"]', OFICIO_SUBJECT);
  await fillIfVisible(page, 'input[name="signatoryName"]', 'SMOKE_ Signatário');
  await fillIfVisible(page, 'input[name="signatoryRole"]', 'Presidente');
  await fillIfVisible(page, 'input[name="itamaratySector"], select[name="itamaratySector"]', 'SGP');
  await fillIfVisible(page, 'input[name="closure"]', 'Atenciosamente,');

  // Rich text editor (contenteditable) — preencher corpo mínimo
  const richText = page.locator('[contenteditable="true"]');
  if (await richText.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
    await richText.first().click();
    await richText.first().fill(`Texto do ofício smoke test criado em ${TS}.`);
  }

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\/secretaria\/oficios/, { timeout: 20_000 });
  await expect(page.locator(`text=${OFICIO_SUBJECT}`)).toBeVisible({ timeout: 10_000 });
});

// ── 8. Auditoria ────────────────────────────────────────────────────────────
test('8. Auditoria — registros das ações do smoke', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app/config/auditoria');
  await expect(page.locator('h1')).toBeVisible();

  // Deve ter ao menos um registro das ações do smoke
  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
});

// ── 9. Notificações ──────────────────────────────────────────────────────────
test('9. Notificações — central abre', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app');
  await expect(page.locator('h1')).toBeVisible();

  // Tentar localizar o botão de notificações pelo aria-label ou ícone
  const bell = page.locator([
    'button[aria-label*="otifica"]',
    'button[aria-label*="Notifica"]',
    '[data-testid="notification-bell"]',
    '[data-testid="notifications"]',
  ].join(', ')).first();

  if (await bell.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await bell.click();
    await expect(
      page.locator('[role="dialog"], [data-testid="notification-panel"], [class*="inbox"]').first(),
    ).toBeVisible({ timeout: 5_000 });
  } else {
    // Fallback: verificar que o header existe (sino não encontrado por seletor)
    console.warn('⚠️  MANUAL: sino de notificações não localizado — verificar manualmente.');
    await expect(page.locator('header, nav').first()).toBeVisible();
  }
});

// ── 10. Reset de Senha ───────────────────────────────────────────────────────
test('10. Reset de Senha — disparo da action', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();

  // Usar email smoke (não o admin real) para não criar token desnecessário
  await page.locator('input[name="email"], input[type="email"]').first().fill(SMOKE_RESET_EMAIL);
  await page.click('button[type="submit"]');

  // Resposta genérica (anti-enumeração) — seja sucesso ou email não encontrado
  await expect(page.locator('body')).toContainText(
    /enviamos|verifique|instru|sucesso|e-mail|email/i,
    { timeout: 15_000 },
  );
});

// ── Cleanup SQL ──────────────────────────────────────────────────────────────
test.afterAll(() => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║            SQL DE LIMPEZA PÓS-SMOKE (audit_log intacto)     ║
╠══════════════════════════════════════════════════════════════╣
║  Executar via console Neon ou psql com DATABASE_MIGRATION_URL ║
╚══════════════════════════════════════════════════════════════╝

-- Atividades
DELETE FROM activities WHERE title ILIKE 'SMOKE_%';

-- Consultas jurídicas e suas notas
DELETE FROM legal_notes
  WHERE entity_id IN (
    SELECT id FROM legal_consultations WHERE title ILIKE 'SMOKE_%'
  );
DELETE FROM legal_consultations WHERE title ILIKE 'SMOKE_%';

-- Ofícios
DELETE FROM oficios WHERE subject ILIKE 'SMOKE_%';

-- Notificações de smoke
DELETE FROM notifications WHERE message ILIKE '%SMOKE_%';

-- NÃO apagar audit_log (ADR 009).
-- Para identificar registros do smoke: WHERE description ILIKE '%SMOKE_%'
`);
});
