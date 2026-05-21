# Resolucao Das Issues Abertas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver e fechar as issues abertas #58, #51, #50, #41 e #24 com evidencia local, testes e comentarios de fechamento no GitHub.

**Architecture:** Dividir em frentes independentes para evitar mistura de escopos: documentacao/M2M, hardening de migrations, validacao operacional de notificacoes, cancelamento financeiro auditavel e editor rich-text de oficios. Cada issue deve terminar com commit proprio, validacao direcionada, comentario no GitHub com evidencias e fechamento apenas quando todos os criterios de aceite da issue estiverem cobertos.

**Tech Stack:** Next.js 16.2.6 App Router, TypeScript, Drizzle/PostgreSQL, Supabase Auth/Realtime, Vercel, Vitest, Playwright quando aplicavel, GitHub CLI.

---

## Ordem Recomendada

1. #41: fechar hardening residual de migrations, porque desbloqueia criterios operacionais de producao.
2. #58: consolidar M2M/docs, porque depende das decisoes de #41 e reduz drift operacional.
3. #50: implementar cancelamento financeiro auditavel, escopo isolado e testavel.
4. #24: editor rich-text de oficios, maior risco UI/PDF.
5. #51: validar Realtime com dois usuarios no ambiente alvo, por ultimo porque depende de producao/staging estavel e credenciais de teste.

## Task 1: #41 Hardening residual de migrations

**Files:**
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/runbook.md`
- Modify: `TODO-PROD.md`
- Test: `scripts/guarded-migrate.test.ts`
- Test: `src/lib/db/rls-granular.test.ts`

- [ ] **Step 1: Confirmar estado atual da issue**

Run:
```bash
gh issue view 41 --json number,title,body,comments,state,url
rg -n "CONCURRENTLY|ALLOW_PRODUCTION_MIGRATIONS|vmohxhyfgywaqfuqeuom|FORCE ROW LEVEL SECURITY" README.md ARCHITECTURE.md docs scripts drizzle/postgres src/lib/db
```
Expected: RLS e guardrail ja implementados; falta documentar estrategia de `CREATE INDEX CONCURRENTLY`.

- [ ] **Step 2: Documentar politica de indices grandes**

Add to `docs/runbook.md` and summarize in `README.md`/`ARCHITECTURE.md`:
```markdown
### Indices grandes e CREATE INDEX CONCURRENTLY

Migrations Drizzle seguem transacionais por padrao. Para tabelas grandes em producao, `CREATE INDEX CONCURRENTLY` nao deve entrar em migrations Drizzle transacionais. O fluxo correto e:

1. criar migration Drizzle apenas para mudancas transacionais seguras;
2. abrir janela operacional separada para o indice concorrente;
3. executar `CREATE INDEX CONCURRENTLY` manualmente pela URL direta/non-pooling;
4. registrar comando, horario, operador e resultado no runbook/release notes;
5. validar com `npm run test:db` e `EXPLAIN` da consulta afetada.
```

- [ ] **Step 3: Validar guardrails e RLS**

Run:
```bash
npm run test -- scripts/guarded-migrate.test.ts src/lib/db/rls-granular.test.ts
npm run test:db
```
Expected: all tests pass.

- [ ] **Step 4: Commitar e fechar**

Run:
```bash
git add README.md ARCHITECTURE.md docs/runbook.md TODO-PROD.md
git commit -m "docs(db): document production index migration policy"
gh issue comment 41 --body "Resolvido. Evidencias: RLS granular em 0039a/b/c e 0040, guardrail em scripts/guarded-migrate.ts, politica de CREATE INDEX CONCURRENTLY documentada, testes scripts/guarded-migrate.test.ts, src/lib/db/rls-granular.test.ts e npm run test:db aprovados."
gh issue close 41
```

## Task 2: #58 M2M, deprecacao legado e docs de producao

**Files:**
- Modify: `README.md`
- Modify: `API.md`
- Modify: `ARCHITECTURE.md`
- Modify: `TODO-PROD.md`
- Optional Modify: `src/lib/integrations/auth.ts`
- Test: `src/lib/integrations/auth.test.ts`
- Test: `src/lib/integrations/keys/service.test.ts`
- Test: `src/app/app/config/integracoes/api-keys/actions.test.ts`
- Test: `src/app/api/v1/events/route.test.ts`

- [ ] **Step 1: Decidir destino do caminho legado**

Check Vercel env:
```bash
vercel env ls | rg 'ASOF_INTEGRATION_(API_KEY|HMAC_SECRET)|ASOF_INTEGRATIONS_ENABLED' || true
```
Expected: no legacy `ASOF_INTEGRATION_API_KEY` or `ASOF_INTEGRATION_HMAC_SECRET` in production.

Decision: if production no longer uses legacy env vars, update docs to say legacy path is code-level compatibility only and disabled in production unless explicitly configured.

- [ ] **Step 2: Atualizar docs M2M**

Update:
- `README.md`: replace legacy env wording with table-backed API keys as primary path.
- `API.md`: include `/api/v1/juridico/sla-warnings`, table-backed scopes, cron bearer endpoints and legacy compatibility note.
- `ARCHITECTURE.md`: mark legacy env auth as deprecated compatibility, not production default.
- `TODO-PROD.md`: mark #58 docs cleanup complete after validation.

- [ ] **Step 3: Validar testes M2M**

Run:
```bash
npm run test -- src/lib/integrations/auth.test.ts src/lib/integrations/keys/service.test.ts src/app/app/config/integracoes/api-keys/actions.test.ts src/app/api/v1/events/route.test.ts
npm run pr:check
```
Expected: focused tests and full readiness pass.

- [ ] **Step 4: Commitar e fechar**

Run:
```bash
git add README.md API.md ARCHITECTURE.md TODO-PROD.md
git commit -m "docs(api): finalize m2m auth production guidance"
gh issue comment 58 --body "Resolvido. Evidencias: API keys table-backed com escopos e rate limit implementadas, envs legadas ausentes no Vercel Production, docs atualizadas para producao, testes M2M e npm run pr:check aprovados."
gh issue close 58
```

## Task 3: #50 Cancelamento de mensalidade com auditoria explicita

**Files:**
- Modify: `src/lib/db/schema/finance.ts`
- Add: `drizzle/postgres/0043_add_monthly_payment_cancellation_fields.sql`
- Modify: `drizzle/postgres/meta/_journal.json`
- Modify: `src/lib/finance/repository.ts`
- Modify: `src/lib/finance/service.ts`
- Modify: `src/app/app/financeiro/mensalidades/actions.ts`
- Modify: UI component under `src/app/app/financeiro/mensalidades`
- Test: `src/lib/finance/repository.test.ts`
- Test: `src/lib/finance/service.test.ts`
- Test: `src/app/app/financeiro/mensalidades/actions.test.ts`

- [ ] **Step 1: Confirmar modelo atual**

Run:
```bash
rg -n "monthlyPayments|paymentStatus|cancel|audit|updateMonthlyPayment" src/lib/db/schema/finance.ts src/lib/finance src/app/app/financeiro/mensalidades
```
Expected: no dedicated cancellation action exists.

- [ ] **Step 2: Adicionar campos de cancelamento**

Add columns to `monthly_payments`:
```sql
ALTER TABLE monthly_payments
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by bigint REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_payments_cancelled_at
  ON monthly_payments (cancelled_at)
  WHERE cancelled_at IS NOT NULL;
```

- [ ] **Step 3: Implementar service**

Add `cancelMonthlyPayment(adminId, paymentId, reason)` that:
- loads current payment;
- updates status to `cancelado` only if enum supports it, otherwise uses current domain decision and sets cancellation fields;
- writes `audit_logs` with old/new state;
- emits `monthly_payment.updated` event with `previousStatus` and cancellation metadata.

If enum lacks `cancelado`, first add enum migration or decide that cancellation is metadata-only. Prefer enum value `cancelado` if product wants visible cancellation state.

- [ ] **Step 4: Implementar action/UI**

Add form action with confirmation and reason field. UI must not delete payment rows.

- [ ] **Step 5: Testar**

Run:
```bash
npm run test -- src/lib/finance src/app/app/financeiro/mensalidades/actions.test.ts
npm run test:db
npm run pr:check
```

- [ ] **Step 6: Commitar e fechar**

Run:
```bash
git add src/lib/db/schema/finance.ts drizzle/postgres src/lib/finance src/app/app/financeiro/mensalidades
git commit -m "feat(finance): audit monthly payment cancellations"
gh issue comment 50 --body "Resolvido. Evidencias: cancelamento dedicado sem apagar historico, motivo/operador/data persistidos, audit_logs before/after, testes financeiro/actions e test:db aprovados."
gh issue close 50
```

## Task 4: #24 Editor rich-text no corpo do oficio

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Add: `src/app/app/secretaria/oficios/_components/RichTextEditor.tsx`
- Modify: `src/app/app/secretaria/oficios/_components/OficioForm.tsx`
- Modify: `src/lib/oficios/pdf.ts`
- Modify: `src/lib/oficios/validations.ts`
- Test: `src/lib/oficios/validations.test.ts`
- Test: `src/lib/oficios/service.test.ts`
- Add focused component test if current test setup supports it.

- [ ] **Step 1: Escolher biblioteca**

Use Context7 before installing. Candidate: Tiptap or Lexical. Pick the smallest SSR-safe option that works with Next.js 16 client components.

- [ ] **Step 2: Install dependency**

Run, after docs check:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-text-align
```

- [ ] **Step 3: Criar editor client-only**

Create `RichTextEditor.tsx` with:
- toolbar: bold, italic, bullet list, ordered list, align left/center/right;
- `valueHtml`, `valueText`, `onChange({ html, text })`;
- accessible buttons with `aria-pressed`;
- no SSR use of browser APIs outside `'use client'`.

- [ ] **Step 4: Integrar no formulario**

Replace textarea in `OficioForm.tsx`. Keep hidden fields or react-hook-form state for:
- `bodyRichText`: sanitized/serialized HTML;
- `bodyPlainText`: editor text content.

- [ ] **Step 5: PDF simplificado**

Update `src/lib/oficios/pdf.ts` to convert HTML to readable text for `pdf-lib`. Minimum safe parser:
- strip tags to paragraphs/lists;
- preserve line breaks for `<p>`, `<br>`, `<li>`;
- ignore style beyond text layout.

- [ ] **Step 6: Testar**

Run:
```bash
npm run test -- src/lib/oficios src/app/app/secretaria/oficios/actions.test.ts
npm run lint
npm run typecheck
npm run build
```

- [ ] **Step 7: Commitar e fechar**

Run:
```bash
git add package.json package-lock.json src/app/app/secretaria/oficios src/lib/oficios
git commit -m "feat(oficios): add rich text editor"
gh issue comment 24 --body "Resolvido. Evidencias: editor rich-text client-only com toolbar, HTML salvo em bodyRichText, texto plano em bodyPlainText, PDF gerado a partir do conteudo, testes/oficios e build aprovados."
gh issue close 24
```

## Task 5: #51 Validacao Realtime com dois usuarios

**Files:**
- Optional Add: `scripts/smoke-notifications-realtime.ts`
- Optional Test: `scripts/smoke-notifications-realtime.test.ts`
- Modify: `docs/runbook.md`
- Modify: `TODO-PROD.md`

- [ ] **Step 1: Preparar dois usuarios de teste**

Use production/staging accounts:
- `realtime-a@asof.org.br`
- `realtime-b@asof.org.br`

Both must map to rows in `admins` with active status. Do not use real member PII.

- [ ] **Step 2: Confirmar publication e RLS**

Run against target DB:
```sql
select pubname from pg_publication where pubname = 'supabase_realtime';
select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications';
select relforcerowsecurity from pg_class where relname = 'notifications';
select policyname, qual from pg_policies where tablename = 'notifications';
```

Expected: `notifications` in `supabase_realtime`, FORCE RLS true, select-own policy present.

- [ ] **Step 3: Fazer smoke com dois browsers/sessoes**

Manual or scripted:
1. Login user A in browser/session A.
2. Login user B in browser/session B.
3. Insert notification for user A.
4. Confirm A receives/lista notification.
5. Confirm B does not list, receive, mark-read, or mark-all-read A's notification.

- [ ] **Step 4: Registrar evidencia**

Update `docs/runbook.md` with exact smoke command/manual checklist and record result in `TODO-PROD.md`.

- [ ] **Step 5: Fechar**

Run:
```bash
git add docs/runbook.md TODO-PROD.md scripts
git commit -m "docs(notifications): record realtime two-user smoke"
gh issue comment 51 --body "Resolvido. Evidencias: migrations aplicadas no ambiente alvo, notifications publicada no supabase_realtime, FORCE RLS ativo, usuario A recebeu apenas suas notificacoes, usuario B nao acessou notificacoes de A, smoke registrado no runbook."
gh issue close 51
```

## Final Validation

- [ ] Run:
```bash
git status --short --branch
npm run pr:check
gh issue list --state open --limit 100
```

- [ ] Expected:
  - working tree clean;
  - `npm run pr:check` passes;
  - none of #58, #51, #50, #41, #24 remain open.

