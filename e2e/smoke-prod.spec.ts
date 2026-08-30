/**
 * Smoke test de produção — automatiza o roteiro do TODO-PROD.md.
 *
 * Vars obrigatórias:
 *   SMOKE_ADMIN_EMAIL     ex: gabriel@asof.org.br
 *   SMOKE_ADMIN_PASSWORD  senha do admin
 *   SMOKE_EXPECTED_COMMIT_SHA  SHA completo esperado no deployment
 *
 * Vars opcionais:
 *   SMOKE_BASE_URL        padrão: https://intranet.asof.com.br
 *   SMOKE_ALLOW_MUTATIONS padrão: false; somente "true" habilita escrita
 *   SMOKE_RUN_ID          obrigatório quando mutações são habilitadas
 *
 * Executar:
 *   npm run smoke:prod
 *
 * Após execução mutante, rodar manualmente o SQL run-scoped impresso no terminal.
 */

import { test, expect, type Page } from '@playwright/test';
import { waitForExpectedDeploymentSha } from '@/lib/smoke/deployment-wait';
import { parseSmokeRuntimeContract } from '@/lib/smoke/runtime-contract';

// ── Validação de env ────────────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;
const smokeRuntime = parseSmokeRuntimeContract(process.env);

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error(
    'SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD são obrigatórios.\n' +
      'Exemplo: SMOKE_ADMIN_EMAIL=gabriel@asof.org.br SMOKE_ADMIN_PASSWORD=... npm run smoke:prod',
  );
}

// ── Dados de smoke ──────────────────────────────────────────────────────────

const TS = new Date().toISOString().slice(0, 16).replace('T', ' ');
const mutationMarker = smokeRuntime.markerPrefix;
const cleanupLikePattern = smokeRuntime.cleanupLikePattern;
const ATIVIDADE_TITLE = mutationMarker ? `${mutationMarker}Atividade Teste ${TS}` : null;
const CONSULTA_TITLE = mutationMarker ? `${mutationMarker}Consulta Teste ${TS}` : null;
const OFICIO_SUBJECT = mutationMarker ? `${mutationMarker}Oficio Teste ${TS}` : null;
const ASSOCIADO_NAME = mutationMarker ? `${mutationMarker}Oficial Teste ${TS}` : null;
const mutatingTest = smokeRuntime.allowMutations ? test : test.skip;

// ── Helper de login ─────────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  if (page.url().includes('/app')) return;

  await page.fill('input[name="email"]', ADMIN_EMAIL!);
  await page.fill('input[name="password"]', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await expectSmokeLoginSuccess(page);
}

function safeLoginErrorCode(url: string): string {
  const parsed = new URL(url);
  const error = parsed.searchParams.get('error') ?? 'missing';
  return /^[a-z0-9_-]+$/i.test(error) ? error : 'unknown';
}

async function expectSmokeLoginSuccess(page: Page) {
  const loginResult = await Promise.race([
    page.waitForURL(/\/app(?:\/|$)/, { timeout: 20_000 }).then(() => 'app'),
    page.waitForURL(/\/change-password(?:\?|$)/, { timeout: 20_000 }).then(() => 'change-password'),
    page.waitForURL(/\/login\?/, { timeout: 20_000 }).then(() => 'login-error'),
  ]).catch(() => 'timeout');

  const currentUrl = page.url();
  const parsed = new URL(currentUrl);

  if (loginResult === 'app' && parsed.pathname.startsWith('/app')) {
    return;
  }

  if (loginResult === 'change-password' && parsed.pathname === '/change-password') {
    throw new Error(
      'Smoke login failed: safe code "change-password". The smoke admin requires password rotation; set must_change_password=false for the approved smoke account.',
    );
  }

  if (loginResult === 'login-error' && parsed.pathname === '/login') {
    throw new Error(
      `Smoke login failed: safe code "${safeLoginErrorCode(currentUrl)}". Verify SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD and the production admin account state.`,
    );
  }

  if (loginResult === 'timeout') {
    throw new Error(
      `Smoke login failed: safe code "timeout" while waiting for login result at path "${parsed.pathname}".`,
    );
  }

  throw new Error(`Smoke login failed: unexpected safe path "${parsed.pathname}".`);
}

async function fillIfVisible(page: Page, selector: string, value: string) {
  const el = page.locator(selector);
  if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await el.fill(value);
  }
}

function requireMutationValue(value: string | null): string {
  if (!smokeRuntime.allowMutations || !value) {
    throw new Error('Smoke runtime contract blocked a production mutation.');
  }

  return value;
}

async function readDeploymentSha(page: Page): Promise<unknown> {
  const response = await page.request.get(new URL('/api/v1/health', page.url()).toString());
  if (!response.ok()) {
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    return null;
  }

  const data = payload.data;
  if (!data || typeof data !== 'object' || !('deployment' in data)) {
    return null;
  }

  const deployment = data.deployment;
  if (!deployment || typeof deployment !== 'object' || !('gitCommitSha' in deployment)) {
    return null;
  }

  return deployment.gitCommitSha;
}

function captureUnexpectedWriteMethods(page: Page): string[] {
  const unexpectedWriteMethods: string[] = [];
  page.on('request', (request) => {
    const method = request.method();
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      unexpectedWriteMethods.push(method);
    }
  });
  return unexpectedWriteMethods;
}

// ── Roteiro ─────────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

// ── 1. Login e Sessão ───────────────────────────────────────────────────────
test('1. Login e Sessão', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await page.goto('/login');
  await expect(page.locator('input[name="email"]')).toBeVisible();

  await page.fill('input[name="email"]', ADMIN_EMAIL!);
  await page.fill('input[name="password"]', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await expectSmokeLoginSuccess(page);

  expect(page.url()).toMatch(/\/app/);

  // Cookie de sessão httpOnly existe
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.httpOnly && c.name.toLowerCase().includes('session'));
  expect(sessionCookie, 'Cookie de sessão httpOnly não encontrado').toBeDefined();

  await waitForExpectedDeploymentSha(smokeRuntime.expectedCommitSha, () => readDeploymentSha(page));
});

// ── 2. Dashboard ────────────────────────────────────────────────────────────
test('2. Dashboard — links operacionais carregam sem escrita', async ({ page }) => {
  await loginAdmin(page);
  const unexpectedWriteMethods = captureUnexpectedWriteMethods(page);
  await page.goto('/app');

  await expect(page.getByRole('heading', { name: 'Painel Administrativo' })).toBeVisible({
    timeout: 15_000,
  });
  // Ao menos um número de KPI carregado (não placeholder)
  await expect(page.locator('main').first()).not.toContainText('...', { timeout: 10_000 });

  await expect(page.getByRole('link', { name: 'Ver atrasadas' })).toHaveAttribute(
    'href',
    '/app/atividades?dueLate=1',
  );

  const indicators = page.getByRole('region', { name: 'Indicadores' });
  for (const href of [
    '/app/atividades?openOnly=1',
    '/app/atividades?dueLate=1',
    '/app/associados?associationStatus=associado&contributionStatus=inadimplente',
  ]) {
    await expect(indicators.locator(`a[href="${href}"]`)).toBeVisible();
  }

  expect(unexpectedWriteMethods).toEqual([]);
});

// ── 3. Associados ───────────────────────────────────────────────────────────
mutatingTest('3. Cadastro de Oficiais — criar oficial e validar perfil', async ({ page }) => {
  const associadoName = requireMutationValue(ASSOCIADO_NAME);
  await loginAdmin(page);
  await page.goto('/app/associados');

  // Lista carrega e campo de busca existe (não depende de dados pré-existentes)
  await expect(page.locator('h1')).toContainText(/Oficiais/);
  await expect(page.locator('input[name="q"]')).toBeVisible();

  // Criar um novo oficial via fluxo de cadastro (pré-requisito de go-live #213)
  await page.goto('/app/associados/novo');
  await expect(page.locator('h1')).toContainText('Cadastrar oficial');

  await page.fill('input[name="fullName"]', associadoName);
  // Submeter via server action (form action) — aguardar redirect ao perfil criado
  await page.click('button[type="submit"]');
  // Fail-fast: only role=alert (form error). Do NOT match .text-red-* — the
  // "Remover" dependente button uses text-red-700 and would false-positive.
  const createResult = await Promise.race([
    page.waitForURL(/\/app\/associados\/\d+$/, { timeout: 30_000 }).then(() => 'ok' as const),
    page
      .locator('form [role="alert"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => 'form-error' as const),
  ]).catch(() => 'timeout' as const);

  if (createResult !== 'ok') {
    const alertText = (
      await page
        .locator('form [role="alert"]')
        .first()
        .innerText()
        .catch(() => '')
    ).slice(0, 300);
    throw new Error(
      `Smoke create oficial failed (${createResult}). url=${page.url()} alert=${alertText || '(none)'}`,
    );
  }

  // Perfil do oficial recém-criado carrega e exibe o nome
  await expect(page.locator('h1, h2').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('não encontrado');
  await expect(page.locator('body')).toContainText(associadoName.slice(0, 20));

  // Voltar à lista e confirmar que o novo oficial aparece na busca
  await page.goto('/app/associados');
  await page.fill('input[name="q"]', associadoName.slice(0, 15));
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await expect(page.locator('body')).toContainText(associadoName.slice(0, 20), {
    timeout: 10_000,
  });
});

// ── 4. Atividades ───────────────────────────────────────────────────────────
mutatingTest('4. Atividades — criar e verificar no board', async ({ page }) => {
  const atividadeTitle = requireMutationValue(ATIVIDADE_TITLE);
  await loginAdmin(page);
  await page.goto('/app/atividades');
  await expect(page.locator('h1')).toBeVisible();

  await page.goto('/app/atividades/nova');
  await expect(page.locator('h1')).toBeVisible();

  // Formulário usa id= e botões type="button" (não type="submit")
  await page.fill('#activity-title', atividadeTitle);
  await fillIfVisible(
    page,
    '#activity-description',
    `${mutationMarker}Criada pelo smoke test automatizado (${TS}).`,
  );

  await page.getByRole('button', { name: 'Criar atividade' }).last().click();

  // Aguardar toast de sucesso (confirma persistência no banco)
  await expect(page.locator('body')).toContainText('Atividade criada com sucesso', {
    timeout: 15_000,
  });

  // Navegar ao board e recarregar para garantir dados atualizados
  await page.goto('/app/atividades');
  await page.waitForURL(/\/app\/atividades$/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
  // Verificar que o título aparece em algum lugar da página (Kanban card ou lista)
  await expect(page.locator('body')).toContainText(atividadeTitle.slice(0, 20), {
    timeout: 10_000,
  });
});

// ── 5. Jurídico ─────────────────────────────────────────────────────────────
mutatingTest('5. Jurídico — criar consulta e avançar status', async ({ page }) => {
  const consultaTitle = requireMutationValue(CONSULTA_TITLE);
  await loginAdmin(page);
  await page.goto('/app/juridico/consultas/nova');
  await expect(page.locator('h1')).toBeVisible();

  await page.fill('input[name="title"]', consultaTitle);
  await fillIfVisible(
    page,
    'input[name="questionSummary"]',
    `${mutationMarker}Consulta criada pelo smoke test automatizado.`,
  );
  await fillIfVisible(
    page,
    'textarea[name="questionFullText"]',
    `${mutationMarker}Texto completo da consulta smoke (${TS}).`,
  );
  await fillIfVisible(page, 'input[name="slaDays"]', '30');

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\/juridico\/consultas\/\d+/, { timeout: 20_000 });
  await expect(page.locator('body')).toContainText(consultaTitle);

  // Avançar status se o controle estiver visível
  const statusControl = page.locator(
    'select[name="status"], button[data-testid="status-btn"], [data-testid="status-select"]',
  );
  if (
    await statusControl
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
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
test('6. Financeiro — mensalidades renderizam sem inicializar ou alterar pagamentos', async ({
  page,
}) => {
  await loginAdmin(page);
  const unexpectedWriteMethods = captureUnexpectedWriteMethods(page);
  await page.goto('/app/financeiro/mensalidades');
  await expect(page.getByRole('heading', { name: 'Controle de Mensalidades' })).toBeVisible({
    timeout: 20_000,
  });

  // Somente leitura: valida o período, os agregados e a fila sem acionar controles de escrita.
  await expect(page.getByLabel('Selecionar mês')).toHaveValue(/^\d{4}-\d{2}$/);
  await expect(page.getByRole('region', { name: 'Fechamento mensal' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Taxa de pagamento' })).toHaveAttribute(
    'aria-valuetext',
    /^\d+% pagos$/,
  );
  await expect(page.getByRole('region', { name: 'Filtros de mensalidades' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fila de conferência' })).toBeVisible();
  await expect(page.getByText(/^\d+ exibidos$/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Perfil da cobrança' })).toBeVisible();

  const renderedContent = await page.locator('main').innerText();
  expect(renderedContent).not.toMatch(/\b(?:NaN|undefined)\b/);
  expect(renderedContent).not.toContain('[object Object]');
  expect(unexpectedWriteMethods).toEqual([]);
});

// ── 7. Ofícios ──────────────────────────────────────────────────────────────
mutatingTest('7. Ofícios — criar e confirmar na lista', async ({ page }) => {
  const oficioSubject = requireMutationValue(OFICIO_SUBJECT);
  await loginAdmin(page);
  await page.goto('/app/secretaria/oficios/novo');
  await expect(page.locator('h1')).toBeVisible();

  // Formulário usa id= e botões type="button"
  await fillIfVisible(page, '#recipient', `${mutationMarker}Destinatário Teste`);
  await fillIfVisible(page, '#recipientRole', 'Diretor');
  await fillIfVisible(page, '#vocativo', 'Senhor Diretor,');
  await fillIfVisible(page, '#subject', oficioSubject);
  await fillIfVisible(page, '#itamaratySector', 'SGP');
  await fillIfVisible(page, '#signatoryName', 'Administrador');
  await fillIfVisible(page, '#signatoryRole', 'Presidente');

  // Rich text editor (TipTap) — clicar no contenteditable e digitar
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await editor.fill(`${mutationMarker}Texto do ofício smoke test criado em ${TS}.`);

  await page.getByRole('button', { name: /Salvar Ofício/i }).click();
  await page.waitForURL(/\/app\/secretaria\/oficios/, { timeout: 20_000 });
  await expect(page.locator(`text=${oficioSubject}`)).toBeVisible({ timeout: 10_000 });
});

// ── 8. Auditoria ────────────────────────────────────────────────────────────
test('8. Auditoria — listagem carrega', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app/config/auditoria');
  await expect(page.locator('h1')).toBeVisible();

  // Leitura apenas: a listagem operacional deve estar disponível.
  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
});

// ── 9. Notificações ──────────────────────────────────────────────────────────
test('9. Notificações — central abre', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/app');
  await expect(page.locator('h1')).toBeVisible();

  // Notificações: tentar sino (Novu/NotificationInbox) ou confirmar header
  const bell = page
    .locator('[data-testid="notification-inbox"] button, [data-testid="notification-bell"]')
    .first();
  if (await bell.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await bell.click();
    await expect(
      page.locator('[role="dialog"], [data-testid="notification-panel"]').first(),
    ).toBeVisible({ timeout: 5_000 });
  } else {
    // Fallback: Novu não configurado — verificar que o header de app existe
    await expect(page.locator('header').first()).toBeVisible();
  }
});

// ── 10. Reset de Senha ───────────────────────────────────────────────────────
test('10. Reset de Senha — página carrega sem disparar action', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

// ── Cleanup SQL ──────────────────────────────────────────────────────────────
test.afterAll(() => {
  if (!smokeRuntime.allowMutations || !mutationMarker || !cleanupLikePattern) {
    return;
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║            SQL DE LIMPEZA PÓS-SMOKE (audit_logs intacto)    ║
╠══════════════════════════════════════════════════════════════╣
║  Executar via console Neon ou psql com DATABASE_MIGRATION_URL ║
╚══════════════════════════════════════════════════════════════╝

BEGIN;

-- Capturar os IDs tecnicos antes de remover as entidades. Nem todo payload do
-- outbox repete o marcador textual (activity/oficio usam entity_type + entity_id).
CREATE TEMP TABLE smoke_run_activities ON COMMIT DROP AS
  SELECT id FROM activities WHERE title LIKE '${cleanupLikePattern}' ESCAPE '\\';
CREATE TEMP TABLE smoke_run_associates ON COMMIT DROP AS
  SELECT id FROM associates WHERE full_name LIKE '${cleanupLikePattern}' ESCAPE '\\';
CREATE TEMP TABLE smoke_run_consultations ON COMMIT DROP AS
  SELECT id FROM legal_consultations WHERE title LIKE '${cleanupLikePattern}' ESCAPE '\\';
CREATE TEMP TABLE smoke_run_oficios ON COMMIT DROP AS
  SELECT id FROM oficios WHERE subject LIKE '${cleanupLikePattern}' ESCAPE '\\';

CREATE TEMP TABLE smoke_run_domain_events ON COMMIT DROP AS
  SELECT id
  FROM domain_events
  WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_run_activities))
     OR (entity_type = 'associate' AND entity_id IN (SELECT id FROM smoke_run_associates))
     OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_run_consultations))
     OR (entity_type = 'official_letter' AND entity_id IN (SELECT id FROM smoke_run_oficios))
     OR payload::text LIKE '%${cleanupLikePattern}' ESCAPE '\\';

DELETE FROM webhook_deliveries
  WHERE domain_event_id IN (SELECT id FROM smoke_run_domain_events);
DELETE FROM domain_events
  WHERE id IN (SELECT id FROM smoke_run_domain_events);

-- Atividades
DELETE FROM activities WHERE id IN (SELECT id FROM smoke_run_activities);

-- Oficiais criados pelo smoke (dependents/health_agreements em cascade;
-- activities/legal_consultations/legal_processes associate_id em set null)
DELETE FROM associates WHERE id IN (SELECT id FROM smoke_run_associates);

-- Consultas jurídicas e suas notas
DELETE FROM legal_notes
  WHERE entity_type = 'consultation'
    AND entity_id IN (SELECT id FROM smoke_run_consultations);
DELETE FROM legal_consultations WHERE id IN (SELECT id FROM smoke_run_consultations);

-- Ofícios
DELETE FROM oficios WHERE id IN (SELECT id FROM smoke_run_oficios);

-- Notificações de smoke
DELETE FROM notifications
  WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_run_activities))
     OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_run_consultations))
     OR (entity_type = 'oficio' AND entity_id IN (SELECT id FROM smoke_run_oficios))
     OR title LIKE '%${cleanupLikePattern}' ESCAPE '\\'
     OR message LIKE '%${cleanupLikePattern}' ESCAPE '\\';

-- Gate fail-closed: qualquer residuo aborta toda a transacao.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM activities WHERE title LIKE '${cleanupLikePattern}' ESCAPE '\\')
     OR EXISTS (SELECT 1 FROM associates WHERE full_name LIKE '${cleanupLikePattern}' ESCAPE '\\')
     OR EXISTS (SELECT 1 FROM legal_consultations WHERE title LIKE '${cleanupLikePattern}' ESCAPE '\\')
     OR EXISTS (SELECT 1 FROM oficios WHERE subject LIKE '${cleanupLikePattern}' ESCAPE '\\')
     OR EXISTS (
       SELECT 1 FROM notifications
       WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_run_activities))
          OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_run_consultations))
          OR (entity_type = 'oficio' AND entity_id IN (SELECT id FROM smoke_run_oficios))
          OR title LIKE '%${cleanupLikePattern}' ESCAPE '\\'
          OR message LIKE '%${cleanupLikePattern}' ESCAPE '\\'
     )
     OR EXISTS (
       SELECT 1 FROM domain_events
       WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_run_activities))
          OR (entity_type = 'associate' AND entity_id IN (SELECT id FROM smoke_run_associates))
          OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_run_consultations))
          OR (entity_type = 'official_letter' AND entity_id IN (SELECT id FROM smoke_run_oficios))
          OR payload::text LIKE '%${cleanupLikePattern}' ESCAPE '\\'
     )
     OR EXISTS (
       SELECT 1 FROM webhook_deliveries
       WHERE domain_event_id IN (SELECT id FROM smoke_run_domain_events)
     )
  THEN
    RAISE EXCEPTION 'smoke_cleanup_incomplete';
  END IF;
END $$;

-- Evidencia run-scoped apos a assercao: todos os valores sao zero.
SELECT
  (SELECT count(*) FROM activities WHERE title LIKE '${cleanupLikePattern}' ESCAPE '\\') AS activities,
  (SELECT count(*) FROM associates WHERE full_name LIKE '${cleanupLikePattern}' ESCAPE '\\') AS associates,
  (SELECT count(*) FROM legal_consultations WHERE title LIKE '${cleanupLikePattern}' ESCAPE '\\') AS consultations,
  (SELECT count(*) FROM oficios WHERE subject LIKE '${cleanupLikePattern}' ESCAPE '\\') AS oficios,
  (SELECT count(*) FROM notifications
    WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_run_activities))
       OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_run_consultations))
       OR (entity_type = 'oficio' AND entity_id IN (SELECT id FROM smoke_run_oficios))
       OR title LIKE '%${cleanupLikePattern}' ESCAPE '\\'
       OR message LIKE '%${cleanupLikePattern}' ESCAPE '\\') AS notifications,
  (SELECT count(*) FROM domain_events
    WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_run_activities))
       OR (entity_type = 'associate' AND entity_id IN (SELECT id FROM smoke_run_associates))
       OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_run_consultations))
       OR (entity_type = 'official_letter' AND entity_id IN (SELECT id FROM smoke_run_oficios))
       OR payload::text LIKE '%${cleanupLikePattern}' ESCAPE '\\') AS domain_events,
  (SELECT count(*) FROM webhook_deliveries
    WHERE domain_event_id IN (SELECT id FROM smoke_run_domain_events)) AS webhook_deliveries;

COMMIT;

-- NÃO apagar audit_logs (ADR 009).
-- Para identificar registros do smoke:
-- WHERE description LIKE '%${cleanupLikePattern}' ESCAPE '\\'
`);
});
