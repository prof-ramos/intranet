# TODO-PROD

Checklist canonica de go-live da intranet ASOF. Itens historicos ja executados
permanecem aqui apenas quando ainda orientam operacao ou auditoria; evidencias
pontuais antigas ficam em `docs/operations/archive/`.

Atualizado em 2026-07-08. Última verificação de gates locais: 2026-07-08.

Para ambientes, bancos, dados, migrations e CI/CD, a fonte oficial pós-go-live é
[`docs/environments.md`](./docs/environments.md) (ADR 015). Este checklist
mantém histórico e operação de produção, mas não deve introduzir novos caminhos
de staging/dev/preview.

## Decisao Atual

- Banco de producao: PostgreSQL gerenciado novo, inicialmente limpo.
- Fonte canonica de schema: `src/lib/db/schema` + historico Drizzle em `drizzle/postgres/` iniciado pelo baseline `0000_green_glorian.sql`.
- Fonte canonica de ambientes/dados/migrations: `docs/environments.md`.
- Auth: server-side propria, `admins.password_hash`, cookie `httpOnly` assinado por `SESSION_SECRET`, `requireAuth()` e `requireRole()`.
- Seed inicial: `INITIAL_ADMIN_EMAIL` + `INITIAL_ADMIN_PASSWORD`, sempre com `must_change_password=true`.
- Notificacao: alerta persistido. Entrega em tempo real nao bloqueia o go-live.
- Documentos/storage: fora do caminho critico ate escolha separada de storage de objetos privado.
- RLS: fora do gate do dia 1; a barreira de seguranca e app server + credenciais PostgreSQL restritas + LGPD.

## Bloqueantes

- [x] Provisionar PostgreSQL gerenciado novo — Neon (intranet-db, `ep-empty-cake-ac26vl6w`, sa-east-1).
- [x] Configurar `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`, `CRON_SECRET`, `TRUSTED_PROXY_COUNT=1` e `ASOF_INTEGRATIONS_ENABLED=false` no Vercel (produção). Concluído em 2026-05-26.
  - [x] `SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`, `CRON_SECRET`, `TRUSTED_PROXY_COUNT=1` e `ASOF_INTEGRATIONS_ENABLED=false` existem em produção.
  - [x] `DATABASE_URL` e `DATABASE_MIGRATION_URL` foram reconfigurados com URLs Neon (`ep-empty-cake-ac26vl6w`). Variáveis injetadas pela Vercel Storage Integration podem coexistir, mas não são o contrato operacional.
- [x] Confirmar rotação de segredos robustos: `SESSION_SECRET` e `ENCRYPTION_MASTER_KEY` gerados com `openssl rand -hex 32` (64 hex chars = 32 bytes de entropia). `CRON_SECRET` rotacionado no mesmo ciclo.
- [x] Aplicar baseline em banco vazio:
  - `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` — concluído em 2026-05-26 contra Neon produção.
  - [x] `ALLOW_PRODUCTION_MIGRATIONS` não foi adicionado ao ambiente Vercel — deve ser passado só na execução pontual de migrate.
- [x] Rodar seed inicial — admin `gabriel@asof.org.br` criado com `must_change_password=true`.
- [x] Admin gabriel.org.br seedado no Neon com must_change_password=true.
- [x] Login do admin validado em producao: gabriel.org.br acessou intranet.asof.com.br com redirect para troca de senha obrigatoria.
- [x] Troca de senha obrigatoria realizada pelo admin apos primeiro login. (gabriel@asof.org.br → nova senha definida em 2026-05-26 via intranet.asof.com.br/change-password)
- [x] Rodar gates locais — `lint`, `typecheck`, `test` (1535 → 1598 testes) e `build`: todos passaram em 2026-07-08 (branch `main`, PR #297 + seed-dev/cadastro local).
- [x] Rodar `npm run test:db` contra Neon produção antes do go-live — schema contract passou em 2026-05-26.
- [x] Smoke test automatizado de producao implementado e validado (ADR 009):
  - Spec E2E Playwright (`e2e/smoke-prod.spec.ts`) cobre login, dashboard, associados, atividades, juridico, oficios, financeiro, auditoria, notificacoes e reset de senha.
  - Executa contra `intranet.asof.com.br` com dados marcados `SMOKE_*`.
  - Conta dedicada de smoke: `smoke-admin@asof.local`, `role=admin`, `is_active=true`, `must_change_password=false`; senha gerenciada apenas por `SMOKE_ADMIN_PASSWORD` no GitHub Actions.
  - Pos-smoke: executar o SQL de limpeza impresso pelo spec; dados operacionais `SMOKE_*` devem ficar zerados e `audit_log` e preservado.
  - CI/CD: job `smoke-prod` roda em push para `main` e pode ser disparado manualmente por `workflow_dispatch` apos a publicacao do workflow.
  - Ultima janela controlada validada: 2026-07-06, `npm run smoke:prod` contra producao passou 10/10 apos aplicar a migration manual `0028_activity_domain_events.sql` no Neon `main`.
- [x] Validar crons com `CRON_SECRET` antes de ativar operacao.
- [x] Confirmar que previews/staging nao apontam para banco de producao — envs gerais de banco foram removidos do ambiente Preview no Vercel em 2026-05-26; restam apenas `SESSION_SECRET` em Preview e `GEMINI_API_KEY` restrita ao branch `feature/outbound-integrations-webhooks`.

## Recomendado Antes Do Go-Live

- [x] Documentos fora do go-live: modulo de upload/download de arquivos legados nao entra no dia 1 (ADR 008). Storage de objetos sera frente separada pos-estreia.
- [x] **Papra / DMS externo — decisão de não seguir (2026-07-08):** POC Papra e subitens de integração **não serão necessários** no caminho operacional da intranet. ADR 012 e a issue #116 permanecem como registro histórico; não reabrir como gate de go-live nem como checklist ativo. Se documentos reentrarem no roadmap, será decisão de produto nova (stack a definir), não retomada automática da POC Papra.
- [x] Rodar `npm audit` — `npm audit --production` reporta 1 vulnerabilidade transitiva moderada (`protobufjs` via `@google/genai`); dev audit adicional: esbuild (Windows-only), js-yaml, undici (Next.js transitiva). Nenhuma com fix sem breaking change imediato. Monitorar advisories.
- [x] E2E local contra `asof_test` aprovado em 2026-05-26 (`npm run test:e2e`, 52 testes). E2E em staging dedicado nao e gate do dia 1 (ADR 009); avaliar pos-estreia se Neon branch staging for adotado.
- [x] Plano de rollback registrado em ADR 010: Neon PITR + branch de restauracao como mecanismo primario, com gatilho objetivo de 30 min em fluxos criticos. Pre-janela exige anotar timestamp/LSN e confirmar `history_retention` Neon suficiente.
- [x] Owners de incidente registrados em ADR 011: papel primario tecnico (app/banco/Vercel/DNS/Mailjet), papel substituto de decisao na Diretoria, papel LGPD/DPO (acumulado pela Diretoria ate formalizacao), e canal unico de incidente. Nomes e contatos vivem em anexo privado fora do repo.
- [x] Higiene completa de branches e PRs realizada em 29/05/2026: remoção de PRs duplicados (#101/#102), branches stale (Pimaco, issue-76, issue-99), resolução de conflitos e merge do PR de extração de auth service (#105), merges dos refactors pendentes e publicação da convenção oficial de nomenclatura de branches (`docs/development/branch-naming.md`). Repositório deixou o estado de dívida de branches acumulada pós-Go-Live.

## Gate Pre-Janela

Marcar a janela de go-live (ADR 009) somente quando todos os itens abaixo estiverem verdes. Confirmar item a item com o owner primario antes de comunicar a Diretoria.

- [x] ADRs 007, 008, 009, 010 e 011 lidos e aceitos pelos owners primario e substituto.
- [x] `history_retention` do projeto Neon `intranet-db` aceito no tier Free (6h), cobrindo confortavelmente a janela de smoke (ADR 010 atualizada).
- [x] Procedimento de anotacao de timestamp/LSN pre-janela combinado com o owner primario (ADR 010).
- [x] Canal unico de incidente criado e populado com owner primario, substituto e DPO (ou Diretoria acumulando o papel) (ADR 011).
- [x] Versao de producao Vercel marcada como "ultima conhecida boa" para redeploy em caso de rollback (ADR 010):
  - Deployment ID: `dpl_9XKJMo5N6Vzyz3rPCLiSq8Fv34N5`
  - URL: `https://asof-intranet-mwpj3qepq-gabriel-ramos-projects-c715690c.vercel.app`
  - Alias: `intranet.asof.com.br`
  - Criado: 2026-05-29 (merge do PR #96)
  - Status: `READY`
- [x] Roteiro de smoke escrito como lista de passos (com dados marcados `SMOKE_*`) e revisado pelo owner primario (ADR 009).
  - *Roteiro disponivel no TODO-PROD.md — seção "Roteiro de Smoke Manual" abaixo.*
- [x] Janela aprovada pela Diretoria com data, hora UTC e duracao estimada registradas.

### Roteiro de Smoke (Automatizado)

O roteiro de smoke e executado automaticamente pelo spec E2E Playwright `e2e/smoke-prod.spec.ts`.

**Pre-requisitos:** `SMOKE_ADMIN_EMAIL` e `SMOKE_ADMIN_PASSWORD` configurados como secrets do GitHub Actions, apontando para a conta dedicada `smoke-admin@asof.local` em producao.

**Execucao manual (local):**
```bash
SMOKE_BASE_URL=https://intranet.asof.com.br SMOKE_ADMIN_EMAIL=smoke-admin@asof.local SMOKE_ADMIN_PASSWORD='...' npm run smoke:prod
```

**Execucao manual (GitHub Actions):** apos o workflow com `workflow_dispatch`
estar publicado em `main`, usar a action `CI` no GitHub e disparar manualmente.
O job `Smoke Test — Production` continua pulado em PRs.

**Passos automatizados (10 testes serializados):**
1. Login e Sessao — valida cookie `httpOnly` assinado.
2. Dashboard — verifica carregamento de KPIs.
3. Associados — lista, busca e navegacao ao perfil do primeiro associado.
4. Atividades — cria atividade `SMOKE_*` e verifica no board.
5. Juridico — cria consulta `SMOKE_*` e avanca status.
6. Financeiro — mensalidades carregam (sem inicializacao de mes).
7. Oficios — cria oficio `SMOKE_*` com TipTap e confirma na lista.
8. Auditoria — verifica registros das acoes do smoke.
9. Notificacoes — central abre via `data-testid="notification-bell"`.
10. Reset de Senha — dispara action de reset para email smoke.

**Pos-smoke (limpeza automatica no terminal):**
O spec imprime o SQL de limpeza ao final. Executar via console Neon ou `psql` com `DATABASE_MIGRATION_URL`:
```sql
DELETE FROM activities WHERE title ILIKE 'SMOKE_%';
DELETE FROM associates WHERE full_name ILIKE 'SMOKE_%';
DELETE FROM legal_notes WHERE entity_id IN (SELECT id FROM legal_consultations WHERE title ILIKE 'SMOKE_%');
DELETE FROM legal_consultations WHERE title ILIKE 'SMOKE_%';
DELETE FROM oficios WHERE subject ILIKE 'SMOKE_%';
DELETE FROM notifications WHERE message ILIKE '%SMOKE_%';
```
_Nota: `audit_log` e preservado (ADR 009)._

## Evidencia Desta Frente

- Removidos helpers/scripts operacionais de Auth externa, entrega em tempo real externa e storage externo.
- Criado baseline inicial `drizzle/postgres/0000_green_glorian.sql`; migrações incrementais atuais seguem o historico em `drizzle/postgres/` e o journal Drizzle.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e` e `npm audit` passaram apos a troca para auth propria.

### Melhorias pós-go-live (2026-06-08)

- **Error handling unificado:** `src/lib/errors/` — hierarquia `DomainError` com `ConcurrencyConflictError`, `NotFoundError`, `ValidationError`, `RateLimitError`, `ExternalServiceError`, `UnauthorizedError`; `toSafeErrorLog` em todas as error boundaries; handlers globais de crash (`unhandledRejection` + `uncaughtException` com `process.exit(1)`) registrados via `src/instrumentation.ts`.
- **Error boundaries completos:** 18 boundaries consolidados via `src/components/ErrorBoundary.tsx` factory; `error.tsx` em todas as rotas autenticadas; `not-found.tsx` em rotas dinâmicas (`associados/[id]`, `secretaria/oficios/[id]/editar`).
- **Logging estruturado:** eliminado `console.error` direto em route handlers e server actions; PII nunca exposta em mensagens de erro retornadas ao cliente; `webhooks/service.ts` corrigido para não vazar `targetUrl`.
- **PAGES.md reescrito:** documentação completa de todas as páginas com funções, requisitos funcionais (checklists) e diagramas Mermaid (fluxo de autenticação, mapa de navegação, sequência de integrações).
- **Assinafy (assinatura digital):** fluxo completo implementado — envio para assinatura (PDF Carlito/ABNT, embutimento completo), webhook handler transacional (atualiza ofício + auditoria + domain event + notificação admins), idempotência, fallback signatários existentes, badge "Abrir página de assinatura".
- **Notificações de ofício:** novo tipo `oficio.status_changed` notifica todos admins ativos quando webhook altera status.
- **Ator sistema em auditoria:** `logAuditAction` aceita `adminId: null` + `executor: Tx`; 2 bypass sites migrados (`finance/service.ts`, `dispatch/route.ts`).
- **Conformidade ABNT/MRPR:** PDF de ofícios alinhado — margens 3/2cm, espaçamento 1.5x, recuo 1.25cm primeira linha, fecho hierárquico, numeração `Ofício nº NNN/YYYY-ASOF`, validação impessoalidade client-side.

### Melhorias pós-go-live (2026-06-14)

- **Refatoração de conclusão de atividades (PR #201):** lógica de `completedAt` extraída para `deriveCompletedAt()` em `transformations.ts`; labels de status e prioridade consolidados via `ACTIVITY_PRIORITY_LABELS` em `status.ts`; validação de `assigneeId` removida do service (delegada ao form).
- **Bulk upsert para mensalidades (#198):** inicialização de mês usa `ON CONFLICT DO UPDATE` em batch ao invés de inserts individuais, reduzindo round-trips.
- **Correção de SQL injection em activities:** queries do repository validam e sanitizam parâmetros antes de interpolar.
- **Otimização N+1 queries:** `identifyLawyerId` e `domainMaterializer` corrigidos para batch de queries em vez de loops individuais.
- **Schema validation em server actions:** `defineFormAction()` com tipagem forte e validação Zod v4; 15+ actions migradas.
- **Segurança:** SSRF validation para webhook URLs; `assigneeName`/`associateName` sanitizados como PII em logs.

### Melhorias pós-go-live (2026-07-08)

- **ADR 018 — Activity domain events outbox (PR #278):** eventos `activity.*` (6 tipos: created, status_changed, assigned, completed, priority_changed, due_date_changed) emitidos transacionalmente em `db.transaction` via `domain_events` outbox; dispatch inline fire-and-forget após commit + cron de retry diário. ADR 018 aceito e formalizado.
- **Security hardening + tech-debt migration (PR #297, 2026-07-08):** remoção do módulo `src/lib/storage/` (108 linhas, dead code); webhook validation com HMAC timestamp + nonce anti-replay em `src/lib/integrations/webhooks/validation.ts`; `define-form-action.ts` refatorado com tipagem Zod v4 completa; remoção de fallback de chave PII legada; schemas de validação expandidos (96 → 65 linhas líquidas, tipos canônicos).
- **Segurança:** prompt-injection delimiters adicionados em geração de email (#269); `allow-same-origin` removido de email preview iframe sandbox (#268); `requireAuth` corrigido para não depender de `x-pathname` (#234); SSRF validation consolidada.
- **Performance:** `Intl.DateTimeFormat` cacheado em formatTimestamp e auditoria; `getAssociatesForReport` com `limit` + sinal de truncamento (#271); webhook dispatch executado fora da transação DB (#267); `logAuditAction` rodando best-effort fora da tx (#266).
- **Infra:** `engines.node >=20` declarado em `package.json` (#276); MCP servers (context7 + postgres) formalizados no repo (#279); lint-staged + pre-push `validate:quick` via husky (#270); migrations 0017/0018 corrigidas com `IF NOT EXISTS` em `ALTER TYPE ... ADD VALUE` (#272). Histórico Drizzle em `drizzle/postgres/`: 30 arquivos SQL (baseline `0000` … `0029_pagination_count_index.sql`).
- **Testes:** 1598 testes (+63 desde 2026-06-23), 170 arquivos; cobertura para outbox atomicidade (#265), ErrorBoundary + error.tsx (#273), relatórios (#275), integration tests (oficios, financeiro, webhooks).
- **Cadastro × legado (`asof_final_limpo.csv`, 39 campos de negócio):** auditoria de paridade schema/forms/perfil. Quase todos os campos existem no modelo; dependentes e convênios vivem em tabelas filhas + UI no perfil. **Fax fica fora de propósito** — `transformLegacyRecord` já ignora a coluna; não quebra migração CSV→intranet (perda intencional, ~3,5% das linhas, muitas ruidosas).
- **Seed sintético local (`npm run db:seed:dev` em `scripts/seed-dev.ts`):** CPF/RG sintéticos, `whatsapp`, endereço residencial DF coerente, `cancellationDate` só em ex-associados (com `joinedAt`), `numberOfDependents` alinhado a linhas em `dependents` via `dependentCountForIndex`.
- **Cadastro completo (Coordenador/Secretaria) — 2026-07-08:**
  - [x] `joinedAt` (Data de Adesão) nos forms criar/editar + perfil administrativo (normalização canônica no service).
  - [x] `leaveDate` / Data de Licença — coluna `leave_date` (migration `0030`), form, perfil, relatórios e import legado.
  - [x] `classPattern` mapeado em `transformLegacyRecord` a partir de “Classe e Padrão”.
  - [x] Dependentes no fluxo de **criar** oficial (linhas dinâmicas; batch insert atômico). Linhas parciais falham com erro explícito. Convênios permanecem no perfil.
  - Fax continua fora de propósito (não bloqueia migração).
- Gates desta frente (2026-07-08): unitários focados de `form-helpers`, `service` e
  `migrate-legacy-transforms` passam localmente no momento desta frente
  (`npx vitest run src/lib/associates/form-helpers.test.ts src/lib/associates/service.test.ts scripts/migrate-legacy-transforms.test.ts`).
  Contagem exata e suite completa (`lint`/`typecheck`/`test`/`test:db`/`build`)
  devem ser revalidadas na janela de PR — não reexecutadas integralmente aqui.

Este arquivo substitui as pendencias antigas de smoke de tempo real e reconciliacao de projetos de banco. Elas nao sao mais caminho de go-live.
