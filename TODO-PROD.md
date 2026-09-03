# TODO-PROD

Checklist canonica de go-live da intranet ASOF. Itens historicos ja executados
permanecem aqui apenas quando ainda orientam operacao ou auditoria; evidencias
pontuais antigas ficam em `docs/operations/archive/`.

Atualizado em 2026-09-03. Última leitura do `main` remoto: 2026-09-03,
HEAD `7f185e46b827be1f99994ee9a172ad69486eab6f`. Último CI completo verde no
`main`: 2026-09-01, SHA `6d14de8efea1738fcf7bad9049d690b31cd40aa6`
([CI run 33514977658](https://github.com/prof-ramos/intranet/actions/runs/33514977658)).
O push do HEAD atual falhou no job E2E e pulou o smoke
([CI run 33555240683](https://github.com/prof-ramos/intranet/actions/runs/33555240683)).

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
- [x] Rodar gates — `Lint, Typecheck & Test`, `Database Contract`, `Build Verification` e `E2E Tests (Playwright)` passaram no `main` em 2026-07-18 (`79ab33e`, [CI run 29629899812](https://github.com/prof-ramos/intranet/actions/runs/29629899812)). Revalidação 2026-09-01 no SHA `6d14de8` (CI 33514977658) verde. HEAD `7f185e4` (2026-09-01): Lint/Typecheck/Test, Database Contract e Build verdes; **E2E falhou** e o smoke de produção foi skipped (CI 33555240683).
- [x] Rodar `npm run test:db` contra Neon produção antes do go-live — schema contract passou em 2026-05-26.
- [x] Smoke test automatizado de producao implementado e validado (ADR 009):
  - Spec E2E Playwright (`e2e/smoke-prod.spec.ts`) cobre login, dashboard, associados, atividades, juridico, oficios, redirecionamento das rotas financeiras/triagem (V2), auditoria, notificacoes e carregamento da pagina de reset de senha.
  - Todo run confirma no health autenticado que `deployment.gitCommitSha` e o SHA completo esperado antes dos demais testes.
  - Push em `main` executa seis cenários read-only: login/sessão + SHA do deployment, dashboard, redirecionamento financeiro/triagem (V2), auditoria, notificações e página de reset de senha.
  - Escritas sao excepcionais: exigem `workflow_dispatch`, input `production_mutations=true` e marcadores `SMOKE_<run-id>_*`.
  - Conta dedicada de smoke: `smoke-admin@asof.local`, `role=admin`, `is_active=true`, `must_change_password=false`; senha gerenciada apenas por `SMOKE_ADMIN_PASSWORD` no GitHub Actions.
  - Pos-smoke mutante: executar manualmente o SQL run-scoped impresso pelo spec; entidades, notificacoes, `domain_events` e `webhook_deliveries` do run devem ficar zerados, com `audit_logs` preservado.
  - CI/CD: o job pós-merge `Smoke Test — Production` roda read-only em push para `main`; dispatch manual também é read-only por default e o job permanece skipped em PRs.
  - Execuções recentes validadas: 2026-08-18, `Smoke Test — Production` aprovado no [CI run 32172046902](https://github.com/prof-ramos/intranet/actions/runs/32172046902), no SHA `1221a10eaeb15906f03844ef15a4030afca6d3a3`; e 2026-08-19, aprovado no [CI run 32215753730](https://github.com/prof-ramos/intranet/actions/runs/32215753730), no SHA `b827bc4ec96f86e2143f52a128bbf890f3c159e5`. O smoke do HEAD `7f185e4` não rodou (E2E anterior falhou).
- [x] Validar crons com `CRON_SECRET` antes de ativar operacao.
- [x] Confirmar que previews/staging nao apontam para banco de producao — envs gerais de banco foram removidos do ambiente Preview no Vercel em 2026-05-26; restam apenas `SESSION_SECRET` em Preview e `GEMINI_API_KEY` restrita ao branch `feature/outbound-integrations-webhooks`.

## Pendências atuais (2026-09-03)

Itens abertos nesta leitura. Não reabrem o gate histórico de go-live; bloqueiam
confiança operacional no `HEAD` atual.

- [ ] Restaurar E2E no `main` no SHA `7f185e4` (ou sucessor) — job
      `E2E Tests (Playwright)` falhou no [CI run 33555240683](https://github.com/prof-ramos/intranet/actions/runs/33555240683/job/100014928053); smoke de produção ficou skipped.
- [ ] Aplicar `0033_unique_associate_identity_hashes` no Neon `main` com
      `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` **antes** de
      confiar na unicidade de CPF/SIAPE/e-mail em produção. O Vercel não
      migra. Schema no repo: 34 SQL em `drizzle/postgres/` (baseline `0000` …
      `0033`). Sem evidência nesta leitura de que `0033` já rodou em prod.
- [ ] Fechar [#436](https://github.com/prof-ramos/intranet/issues/436) via
      [PR #438](https://github.com/prof-ramos/intranet/pull/438) (mock de DNS
      nos testes de webhook). Unitários locais sem rede ainda rejeitam
      `https://example.com/webhook` em `isPublicWebhookUrl`.
- [ ] Revalidar `npm audit --omit=dev` — em 2026-09-03: 5 high + 29 moderate
      (34 total). O check histórico abaixo registrou 1 moderate transitiva;
      o número atual é outro e precisa de triagem, não de “já feito”.

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
  - _Roteiro disponivel no TODO-PROD.md — seção "Roteiro de Smoke Manual" abaixo._
- [x] Janela aprovada pela Diretoria com data, hora UTC e duracao estimada registradas.

### Roteiro de Smoke (Automatizado)

O roteiro de smoke e executado automaticamente pelo spec E2E Playwright `e2e/smoke-prod.spec.ts`.

**Pre-requisitos:** `SMOKE_ADMIN_EMAIL` e `SMOKE_ADMIN_PASSWORD` configurados como secrets do GitHub Actions, apontando para a conta dedicada `smoke-admin@asof.local` em producao. O runner exige `SMOKE_EXPECTED_COMMIT_SHA` completo; o CI usa `${{ github.sha }}`.

**Execucao manual (local):**

```bash
SMOKE_BASE_URL=https://intranet.asof.com.br SMOKE_ADMIN_EMAIL=smoke-admin@asof.local SMOKE_ADMIN_PASSWORD='...' SMOKE_EXPECTED_COMMIT_SHA=<sha-completo> SMOKE_ALLOW_MUTATIONS=false npm run smoke:prod
```

**Execucao manual (GitHub Actions):** apos o workflow com `workflow_dispatch`
estar publicado em `main`, usar a action `CI` no GitHub e disparar manualmente.
O default `production_mutations=false` e read-only. Marque `true` somente em uma
janela mutante autorizada; o CI define `SMOKE_RUN_ID` com run e tentativa. O job
`Smoke Test — Production` continua pulado em PRs.

**Passos automatizados (10 testes serializados):**

1. Login, Sessao e Deployment — valida cookie `httpOnly` e o SHA completo exato.
2. Dashboard — verifica carregamento de KPIs.
3. Associados — cria oficial `SMOKE_<run-id>_*` somente no modo mutante.
4. Atividades — cria atividade `SMOKE_<run-id>_*` somente no modo mutante.
5. Juridico — cria consulta `SMOKE_<run-id>_*` somente no modo mutante.
6. Financeiro e triagem — rotas V2 redirecionam ao dashboard (sem tela de mensalidades).
7. Oficios — cria oficio `SMOKE_<run-id>_*` somente no modo mutante.
8. Auditoria — confirma que a listagem abre em modo read-only.
9. Notificacoes — central abre via `data-testid="notification-bell"`.
10. Reset de Senha — confirma que a pagina carrega sem disparar a action.

**Pos-smoke mutante (limpeza manual obrigatoria):**
O spec imprime SQL limitado ao `SMOKE_RUN_ID`. Execute-o via console Neon ou
`psql` com `DATABASE_MIGRATION_URL`; substitua `<run-id>` pelo identificador
validado do run. O modo read-only nao imprime SQL.

Nao reconstrua a limpeza com deletes parciais: a transacao impressa captura os
IDs tecnicos das quatro entidades, remove `webhook_deliveries` antes de
`domain_events`, limpa as tabelas operacionais e prova zero antes do commit.

_Nota: `audit_logs` e preservado (ADR 009). Residuos anteriores a esse contrato
continuam pertencendo ao inventario e a limpeza controlada do Plano 057._

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

### Higiene operacional (2026-07-18 — Plano 057)

- **Correção do registro de maio:** a entrada de 29/05/2026 acima ("Higiene completa de branches e PRs") descrevia o estado daquela data; entre então e 2026-07-18 acumularam-se 25 branches remotas stale (PRs de bots automatizados — Bolt, Jules, palette, testing, false-positive — todos `CLOSED`, nenhum mergeado). Higiene revalidada e refeita nesta data; ver Plano 057 para o protocolo completo.
- **Branches remotas:** inventariadas todas via `git ls-remote --heads origin`; as 25 branches de PRs fechados foram removidas (via API do GitHub, sem afetar branches com PR aberto). `codex/060-read-only-production-smoke` (PR #400) e `codex/064-reconcile-associate-identities` (PR #399) foram mergeadas em `main` em seguida e suas branches remotas excluídas; nenhuma branch além de `main` resta no remoto além desta evidência.
- **Resíduos `SMOKE_*` em produção:** inventário `READ ONLY` prévio (sem PII, sem alterar `audit_logs`) contou `activities`: 59, `associates`: 58, `legal_consultations`: 57, `oficios`: 57, `notifications`: 0 (registros acumulados de execuções de smoke entre 2026-07-09 e 2026-07-18). `legal_notes`, `dependents` e `health_agreements` associados: 0 em todos os casos.
- **Limpeza executada:** transação única (`BEGIN`/`COMMIT`, dependências antes dos pais) removeu exatamente os registros `SMOKE_*` acima. Contagem pós-limpeza verificada com conexão nova (fora da transação): zero nas cinco tabelas. `audit_logs` não foi tocado.
- **Pendência remanescente:** nenhuma — o Plano 060 (contenção do smoke de produção, PR #400) foi mergeado em `main` em seguida a este inventário, substituindo a repetição manual pela contenção automática do smoke.
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

### Validação pós-merge e encerramento de WIPs (2026-08-18)

- **WIP do dashboard:** nove arquivos eram idênticos a `main` e seis versões
  históricas continuavam recuperáveis em `39a57fc` ou `189b6bf`. Não havia
  conteúdo único a reaplicar; reaplicar o WIP teria reintroduzido regressões.
  Os 14 arquivos rastreados inventariados foram restaurados, o untracked
  `payment-status-ui.ts` foi removido, e a worktree auxiliar
  `intranet-main-merge` foi encerrada. A branch `codex/dashboard-operational-wip`
  não existe mais.
- **Branches absorvidas:** PR #419 foi incorporado em `main` no merge SHA
  `1221a10eaeb15906f03844ef15a4030afca6d3a3`; a branch anterior apontava para
  `25ef8425dfe7dec69878f6d7a70cf0116ad6e7dc` e foi removida. PR #413 (Jules)
  também está mesclado; `6e2aa47` é ancestral de `d6ce190`, absorvido pelo
  squash `af2fe6b`. Os SHAs permanecem recuperáveis por reflog/objetos Git.
- **Estado do smoke:** o CI run `32172046902` passou no SHA completo acima;
  seis cenários read-only passaram e quatro mutantes ficaram skipped. A janela
  de observação operacional de 24–48 horas ainda deve ser acompanhada pelo
  owner, sem executar mutações nem SQL de limpeza.
- **Observação inicial do deployment:** Vercel reportou o deployment de produção
  `dpl_4WPrYNKDgbW7iKHuYpyEAXCkAcsN` como `READY`, com alias
  `intranet.asof.com.br`. Na janela inicial, os logs agregados mostraram 0
  entradas de nível `error` e duas requisições anônimas `GET /api/v1/health`
  com `401`, resposta esperada sem sessão. O login autenticado, o SHA e a
  página de auditoria foram verificados pelo smoke; isso não substitui a
  observação contínua de erros de login e auditoria por 24–48 horas. A janela
  começou em `2026-08-18T18:37Z`; revisar no mínimo em `2026-08-19T18:37Z` e
  encerrar somente após `2026-08-20T18:37Z`, se não houver alertas.
- **Follow-up da observação:** o push de `main` no SHA `b827bc4ec96f86e2143f52a128bbf890f3c159e5`
  gerou deployment Production com status `success` e CI completo verde, incluindo
  o smoke read-only. Em `2026-08-20T10:37Z`, uma chamada anônima a
  `/api/v1/health` respondeu `401` com `unauthorized`, comportamento esperado sem
  sessão; isso não substitui a checagem final de logs de login/auditoria. A janela
  permanece aberta até `2026-08-20T18:37Z`.
- **Encerramento da janela (2026-09-03):** o prazo `2026-08-20T18:37Z` já passou.
  Não há evidência nova de alerta de login/auditoria nesta leitura. A janela de
  24–48 h de agosto está encerrada; a confiança operacional volta a depender do
  CI/smoke do `HEAD` atual (E2E vermelho em `7f185e4`).
- **E2E:** o setup passou a registrar as fases sem dados sensíveis. No run local
  de 2026-08-18, foram medidos: warmup JIT 57,0 s, autenticação 6,2 s, servidor
  pronto 3,8 s, migrations 1,1 s, seed 0,7 s e setup total 70,1 s. A suíte
  completa passou 83/83 em 7,8 min; o cache de browsers está configurado no
  E2E e no smoke. O timeout permanece em 25 min para E2E e 15 min para smoke.

### Estado operacional (2026-08-31 a 2026-09-03)

- **V2 de produto (PR #430):** UI operacional de financeiro e email-triage
  oculta; rotas redirecionam ao dashboard. Código e crons permanecem. Smoke
  cobre o redirecionamento, não a tela de mensalidades.
- **Identidade cadastral (SHA `803712f`):** índices únicos em `cpf_hash`,
  `siape_hash` e `primary_email_hash` + mapeamento `23505` → `ValidationError`.
  Contrato de schema atualizado. Aplicar `0033` no Neon `main` é pendência
  operacional (seção acima).
- **Auth (SHA `a56e2d1` + testes `4e6f8e1`):** `isProductionRuntime()` unifica
  `NODE_ENV`/`VERCEL_ENV` para `SKIP_AUTH` e cookie `Secure`.
- **Dashboard (SHA `7f185e4`):** WelcomeBanner, empty states e atalhos na
  sidebar. Lint/typecheck/unit/DB/build verdes nesse SHA; E2E falhou.
- **Abrir:** issue [#436](https://github.com/prof-ramos/intranet/issues/436) e
  PR [#438](https://github.com/prof-ramos/intranet/pull/438) (DNS nos testes de
  webhook). Drafts #432 (MCP operador) e #428 (Cloud Agent env) não são gate
  de produção.

Este arquivo substitui as pendencias antigas de smoke de tempo real e reconciliacao de projetos de banco. Elas nao sao mais caminho de go-live.
