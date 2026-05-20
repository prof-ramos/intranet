# TODO-PROD

Checklist canonica de go-live da intranet ASOF.

Atualizado em 2026-05-20 a partir de verificacao local do repositorio, docs, CI, scripts, migrations, env validation, rotas/API/server actions e modulos criticos em `src/lib`.

## Objetivo

Levar a intranet ASOF para producao com estado de codigo, banco, seguranca, deploy e operacao explicitamente verificavel. Este arquivo e a fila unica de pendencias para go-live: se a evidencia local contradizer uma tarefa antiga, prevalece a evidencia registrada aqui.

## Snapshot Atual

- Repositorio local: `/Users/gabrielramos/projetos/ASOF/intranet`
- Branch local: `main`
- HEAD local: `3157453` (`chore(prod): harden go-live readiness`)
- Worktrees ativos: somente o checkout principal.
- PRs abertos no GitHub: nenhum no momento da verificacao local.
- Estado do working tree apos esta continuidade: somente `TODO-PROD.md` modificado. A branch local esta `ahead 1` de `origin/main`; o commit local `3157453` e esta atualizacao documental precisam ser publicados/integrados ou o deploy precisa apontar explicitamente para o SHA correto antes de producao.
- Stack verificada localmente: Next.js `16.2.6`, npm, App Router em `src/app`, Drizzle/PostgreSQL em `src/lib/db` e `drizzle/postgres`, deploy Vercel com `vercel.json`.
- Migrations Drizzle existentes ate `0042_add_sla_warning_notification_type.sql`.
- Rotas API verificadas: `oficios/[id]/download`, `v1/events`, `v1/events/dispatch`, `v1/health`, `v1/juridico/sla-warnings`.

## Concluido / Base Existente

- [x] Autenticacao server-side existe via `requireAuth()` e `requireRole()` em `src/lib/auth`.
- [x] Bypass local de auth fica condicionado a `SKIP_AUTH=true` e variaveis `DEV_USER_*` em `src/lib/env.ts`.
- [x] Rate limit de login existe em banco, com janela e limite configurados em `src/lib/auth/login-rate-limit.ts`.
- [x] Headers de seguranca globais existem em `next.config.ts`, incluindo CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.
- [x] Logger estruturado existe em `src/lib/logger.ts`, com redacao de chaves sensiveis em contexto estruturado.
- [x] Sanitizacao LGPD compartilhada existe em `src/lib/sanitize-pii.ts`.
- [x] RLS foi endurecido por migrations dedicadas, incluindo `0023_rls_restrict_to_authenticated.sql`, `0039a/b/c_rls_*` e `0040_force_rls_notifications.sql`.
- [x] Pool PostgreSQL runtime esta configurado em `src/lib/db/index.ts` com `max`, `max_lifetime`, `statement_timeout`, `application_name` e suporte a pooler/transacao.
- [x] CI existe em `.github/workflows/ci.yml` com lint, typecheck, unit tests, build, contrato de banco e E2E.
- [x] Workflow manual de migration de staging existe em `.github/workflows/migrate-staging.yml`.
- [x] Script de readiness de PR existe em `scripts/check-pr-ready.sh`.
- [x] Script de setup de secrets de producao existe em `scripts/setup-production-env.sh`.
- [x] Guardrail de migration de producao existe em `scripts/guarded-migrate.ts` e exige `ALLOW_PRODUCTION_MIGRATIONS=true`.
- [x] Runbook operacional existe em `docs/runbook.md` com deploy, backup, smoke test e rollback.
- [x] Webhooks/outbox tem modulos dedicados em `src/lib/integrations`, com HMAC, API keys, rate limit, criptografia de secret e despacho por cron.
- [x] Reset de senha usa link de recuperacao por email Mailjet quando configurado e fallback de exibicao/copia quando email nao e entregue.
- [x] `MAILJET_API_KEY` e `MAILJET_SECRET_KEY` existem no Vercel Production, configuradas via `vercel env add` em 2026-05-20.
- [x] API keys de integracao exigem `requireAuth()` + `requireRole(['admin'])` antes de chamadas ao service.
- [x] Falhas Mailjet nao registram corpo bruto de resposta do provedor; o erro exposto fica limitado a codigo/status.
- [x] Templates de email escapam `resetLink` em `href` e corpo HTML.
- [x] SLA juridico tem rota agendada `GET /api/v1/juridico/sla-warnings`, protegida por `CRON_SECRET`.
- [x] `vercel.json` agenda `/api/v1/events/dispatch` (`0 3 * * *`) e `/api/v1/juridico/sla-warnings` (`0 4 * * *`).
- [x] Transicao automatica financeira de `pendente` para `atrasado` gera auditoria e evento de dominio em transacao.

## Pendente Bloqueante Para Producao

- [ ] Integrar o commit local `3157453` e esta atualizacao de `TODO-PROD.md` antes do deploy Git-based da Vercel: fazer commit/push/PR/merge para `origin/main`, ou registrar decisao explicita de deploy manual a partir do SHA correto.
- [ ] Rodar a readiness completa apos o commit final: `npm run pr:check` ou, se houver limitacao de ambiente, registrar separadamente `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:db` e `npm run build`.
- [ ] Validar que `vercel.json` publicado contem ambos os crons:
  - `/api/v1/events/dispatch` em janela diaria.
  - `/api/v1/juridico/sla-warnings` em janela diaria.
- [ ] Confirmar no Vercel Production as env vars obrigatorias:
  - `DATABASE_URL`
  - `DATABASE_MIGRATION_URL` ou URL direta equivalente apenas para migration controlada
  - `DATABASE_SUPABASE_URL` ou `NEXT_PUBLIC_DATABASE_SUPABASE_URL`
  - `DATABASE_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY`
  - `DATABASE_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY`, se o alvo ainda usar anon key legada
  - `DATABASE_SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`
  - `ENCRYPTION_MASTER_KEY`
  - `CRON_SECRET`
  - `TRUSTED_PROXY_COUNT=1`
  - `SKIP_AUTH` ausente ou `false`
  - `ASOF_INTEGRATIONS_ENABLED=false`, salvo decisao explicita de ativar integracoes no dia 1
- [ ] Confirmar Mailjet em producao:
  - `MAILJET_API_KEY` e `MAILJET_SECRET_KEY` ja existem no Vercel Production;
  - ainda falta smoke test real de envio de reset por Mailjet em ambiente deployado;
  - se o smoke falhar no dia 1, validar o fallback operacional de reset link na UI admin e documentar o uso temporario.
- [ ] Confirmar que secrets nao vazaram antes do go-live: revisar historico Git, logs de CI/CD, logs Vercel e canais de compartilhamento. Rotacionar qualquer segredo exposto ou com mais de 90 dias.
- [ ] Executar migration em staging antes de producao:
  - backup/snapshot antes da migration;
  - rodar workflow `.github/workflows/migrate-staging.yml` com `confirm=MIGRATE-STAGING`;
  - rodar `npm run test:db` contra staging/replica apos migration;
  - validar que migrations aplicadas chegam ate `0042_add_sla_warning_notification_type.sql`.
- [ ] Executar migration de producao somente apos janela aprovada:
  - confirmar alvo Supabase oficial `vmohxhyfgywaqfuqeuom` (`db-intranet`) ou atualizar esta linha se o alvo mudou;
  - realizar backup/snapshot imediatamente antes;
  - confirmar URL direta/non-pooling para migration;
  - executar com guardrail `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate`;
  - registrar migration aplicada, horario, operador e commit SHA.
- [ ] Validar RLS em ambiente deployado:
  - `FORCE ROW LEVEL SECURITY` nas tabelas de aplicacao;
  - politicas `TO authenticated`, sem politicas amplas acidentais;
  - `notifications` coberta por RLS e sem vazamento entre usuarios;
  - acesso browser/Supabase anon nao consegue ler dados de outro usuario.
- [ ] Executar smoke test autenticado em producao ou staging final:
  - login admin, diretoria e secretaria;
  - bloqueio de secretaria em rotas admin;
  - dashboard;
  - associados/lista/perfil;
  - financeiro/mensalidades;
  - juridico/consultas;
  - oficios e download protegido;
  - notificacoes;
  - reset de senha Mailjet ou fallback;
  - API keys admin-only;
  - webhooks/outbox se integracoes forem ativadas.
- [ ] Validar crons com autorizacao real:
  - request sem `Authorization` deve retornar 401;
  - request com `Bearer CRON_SECRET` deve executar `/api/v1/events/dispatch`;
  - request com `Bearer CRON_SECRET` deve executar `/api/v1/juridico/sla-warnings`;
  - logs nao podem conter CPF, SIAPE, token completo, reset link completo ou corpo bruto de provedor.
- [ ] Definir monitoramento minimo antes do go-live:
  - responsavel de plantao;
  - onde olhar logs Vercel e Supabase;
  - thresholds operacionais para erro 5xx, falha de cron, falha de login e timeout de banco;
  - canal de acionamento para rollback.

## Pendente Recomendado Antes Do Go-Live

- [ ] Atualizar `README.md` e `API.md` para documentar que `CRON_SECRET` protege tambem `/api/v1/juridico/sla-warnings`, nao apenas `/api/v1/events/dispatch`. Evidencia local: `README.md` ainda lista somente tres rotas versionadas e `API.md` ainda diz "5 endpoints" com ultima atualizacao `2026-05-18`.
- [ ] Atualizar `docs/runbook.md` com smoke test explicito para SLA juridico, Mailjet/fallback de reset, API keys admin-only e webhooks/outbox.
- [ ] Revisar usos de `logger.*(..., error)` em fluxos sensiveis alem do Mailjet, especialmente auth/reset/change-password, para evitar `error.message` com PII ou tokens.
- [ ] Rodar `npm audit` e registrar decisao para cada achado relevante.
- [ ] Rodar `npm run format:check` ou documentar por que o projeto nao exige formatação bloqueante.
- [ ] Rodar `npm run test:e2e` em ambiente local limpo ou staging, usando o banco `asof_test`/setup proprio do Playwright.
- [ ] Rodar `EXPLAIN ANALYZE` nas consultas criticas de dashboard, associados, financeiro, juridico e oficios apos migration remota, principalmente nas tabelas protegidas por RLS.
- [ ] Validar performance de listas com dados representativos: associados, atividades, mensalidades, consultas juridicas, auditoria e notificacoes.
- [ ] Fazer QA manual de LGPD por perfil:
  - admin ve dados administrativos necessarios;
  - diretoria ve somente o que precisa;
  - secretaria nao ve CPF/SIAPE/endereco quando nao autorizado;
  - exports respeitam mascaramento esperado.
- [ ] Confirmar que previews da Vercel nao apontam para banco de producao e nao recebem service role de producao.
- [ ] Criar checklist de rollback de dados para migrations nao reversiveis, com decisao explicita entre rollback de app, hotfix forward e restore de snapshot.
- [ ] Configurar error tracking externo, se adotado, como Sentry/Datadog/equivalente. O repo tem logs estruturados, mas nao ha evidencia local de APM externo configurado.
- [ ] Registrar owners de operacao para incidentes de auth, banco, Vercel, Supabase, Mailjet e dominio/DNS.

## Pos-Go-Live

- [ ] Registrar data/hora do deploy, commit SHA, deployment URL, operador, migration aplicada e snapshot/backup usado.
- [ ] Monitorar por 72 horas:
  - login e rate limiting;
  - erros 5xx;
  - latencia p95;
  - conexoes/timeout Postgres;
  - execucao dos crons Vercel;
  - fila `domain_events`/outbox;
  - notificacoes SLA e `activity.assigned`;
  - reset de senha;
  - webhooks se habilitados.
- [ ] Revisar logs do primeiro ciclo de cron de `/api/v1/events/dispatch` e `/api/v1/juridico/sla-warnings`.
- [ ] Auditar eventos financeiros automaticos gerados apos o primeiro ciclo real.
- [ ] Confirmar que nao houve vazamento LGPD em logs, respostas de API, exports ou mensagens de erro.
- [ ] Remover branches/worktrees temporarios que sobrarem apos merge e estabilizacao.
- [ ] Abrir issues separadas para melhorias nao bloqueantes: Listmonk, dashboards adicionais, UX de relatórios, APM externo, hardening adicional de CSP se necessario.
- [ ] Planejar rotacao periodica de `CRON_SECRET`, chaves de API de integracao, Mailjet e chaves de criptografia conforme politica operacional.

## Evidencias E Comandos De Validacao

### Executados nesta verificacao local

- `git status --short --branch`
  - resultado inicial: `## main...origin/main [ahead 1]`, sem arquivos modificados, staged ou untracked. Resultado apos esta edicao: `M TODO-PROD.md`.
- `git rev-parse --short HEAD`
  - resultado: `3157453`.
- `git log -1 --oneline`
  - resultado: `3157453 chore(prod): harden go-live readiness`.
- `git worktree list --porcelain`
  - resultado: somente `/Users/gabrielramos/projetos/ASOF/intranet`, branch `refs/heads/main`.
- `gh pr list --state open --json number,title,headRefName,baseRefName`
  - resultado: `[]`.
- `sed -n '1,260p' TODO-PROD.md`
  - resultado: conteudo anterior desta rodada ainda descrevia mudancas locais nao commitadas e HEAD `98e0012`, contradizendo `git status` e `git rev-parse`.
- `find drizzle/postgres -maxdepth 1 -type f | sort | tail -12`
  - resultado: migrations ate `0042_add_sla_warning_notification_type.sql`.
- `find src/app/api -maxdepth 5 -type f | sort`
  - resultado: rotas API atuais incluem `v1/events`, `v1/events/dispatch`, `v1/health`, `v1/juridico/sla-warnings` e download de oficios.
- `find .github/workflows -maxdepth 1 -type f -print | sort`
  - resultado: `ci.yml` e `migrate-staging.yml`.
- `cat vercel.json`
  - resultado: `framework: nextjs` e crons para `/api/v1/events/dispatch` (`0 3 * * *`) e `/api/v1/juridico/sla-warnings` (`0 4 * * *`).
- `rg -n "sla-warnings|events/dispatch|CRON_SECRET|5 endpoints|Última atualização" API.md README.md docs/runbook.md TODO-PROD.md`
  - resultado: `README.md` e `API.md` ainda documentam `CRON_SECRET`/rotas versionadas sem incluir a rota de SLA juridico.
- `sed -n '1,260p' src/lib/env.ts`
  - resultado: schema aceita as variaveis Supabase atuais e exige `CRON_SECRET` quando `VERCEL_ENV=production`.
- `sed -n '1,240p' src/app/api/v1/events/dispatch/route.ts` e `sed -n '1,220p' src/app/api/v1/juridico/sla-warnings/route.ts`
  - resultado: ambas as rotas exigem `Authorization: Bearer <CRON_SECRET>`, usam `safeCompare` e rejeitam metodos diferentes de `GET`.
- `sed -n '1,240p' src/app/app/config/integracoes/api-keys/actions.ts`
  - resultado: actions de API key exigem `requireAuth()` e `requireRole(['admin'])`.
- `sed -n '1,340p' src/app/app/config/usuarios/actions.ts`, `sed -n '1,260p' src/lib/email/index.ts` e `sed -n '1,220p' src/lib/email/templates.ts`
  - resultado: reset gera link antes de invalidar senha, tenta Mailjet quando configurado, retorna fallback operacional se email falhar e evita logar corpo bruto do provedor; template escapa o `href`.
- `sed -n '1,260p' src/lib/finance/service.ts`, `sed -n '1,240p' src/lib/finance/repository.ts` e `sed -n '1,300p' src/lib/juridico/sla-notifications.ts`
  - resultado: financeiro automatico registra auditoria/evento, e SLA juridico emite notificacoes com resumo de execucao.
- `printf <redacted> | vercel env add MAILJET_API_KEY production`
  - resultado: `Added Environment Variable MAILJET_API_KEY to Project asof-intranet`.
- `printf <redacted> | vercel env add MAILJET_SECRET_KEY production`
  - resultado: `Added Environment Variable MAILJET_SECRET_KEY to Project asof-intranet`.
- `vercel env ls | rg 'MAILJET_(API_KEY|SECRET_KEY)'`
  - resultado: `MAILJET_API_KEY` e `MAILJET_SECRET_KEY` aparecem como `Encrypted` em `Production`.
- `git diff --check -- TODO-PROD.md`
  - resultado: sem erros de whitespace no documento alterado.

### Verificacoes locais usadas como evidencia de codigo

- `package.json`
  - scripts confirmados: `lint`, `typecheck`, `test`, `test:db`, `test:e2e`, `build`, `pr:check`, `db:migrate`, `validate:full`.
- `.github/workflows/ci.yml`
  - confirma lint/typecheck/unit/build/schema contract/E2E em CI.
- `.github/workflows/migrate-staging.yml`
  - confirma migration manual de staging com confirmacao explicita.
- `scripts/check-pr-ready.sh`
  - confirma readiness completa antes de PR.
- `scripts/setup-production-env.sh`
  - confirma geracao/adicao de `ENCRYPTION_MASTER_KEY`, `CRON_SECRET`, `TRUSTED_PROXY_COUNT` e Mailjet.
- `scripts/guarded-migrate.ts`
  - confirma guardrail para migrations de producao.
- `src/lib/env.ts`
  - confirma validacao de env, `CRON_SECRET` obrigatorio em `VERCEL_ENV=production` e regras de `SKIP_AUTH`.
- `vercel.json`
  - confirma crons locais para events dispatch e SLA juridico.
- `src/lib/db/index.ts`
  - confirma configuracao de pool, timeouts, SSL e pooler.
- `src/lib/db/schema` e `drizzle/postgres`
  - confirmam schema/migrations locais.
- `src/lib/auth`, `src/lib/integrations`, `src/lib/notifications`, `src/lib/juridico`, `src/lib/finance`, `src/lib/email`
  - confirmam os modulos criticos citados nesta checklist.

### Validacoes recentes registradas no commit local

- O commit local `3157453` registra a frente `chore(prod): harden go-live readiness`. Nesta rodada de continuidade, a verificacao de testes foi documental/estatica e nao reexecutou a suite completa; `git diff --check -- TODO-PROD.md` passou.
- Antes de producao, reexecutar `npm run pr:check` continua bloqueante porque o commit `3157453` ainda esta apenas local (`ahead 1`) e a checklist canonica foi editada novamente em `TODO-PROD.md`.

### Nao executados nesta verificacao e motivo

- `npm run test:db`
  - nao executado nesta rodada porque exige banco PostgreSQL/Supabase configurado para o alvo correto; deve ser rodado contra staging/replica apos migrations, nao diretamente contra producao.
- `npm run test:e2e`
  - nao executado nesta rodada porque exige ambiente E2E com banco `asof_test`, servidor Playwright e secrets adequados; deve ser rodado antes do go-live.
- Verificacao Vercel Production de env vars, crons e logs
  - nao executada porque depende de acesso externo/credenciais Vercel.
- Verificacao Supabase Production de migrations, RLS e backups
  - nao executada porque depende de acesso externo/credenciais Supabase e janela aprovada.
- Smoke test real em producao
  - nao executado porque depende de deployment aprovado, usuarios reais de teste e janela operacional.

## Definicao De Pronto Para Go-Live

- Working tree limpo apos commit/stash intencional desta atualizacao documental.
- Commit local `3157453` e a atualizacao de `TODO-PROD.md` integrados em `origin/main` ou deployment registrado explicitamente no SHA correto.
- `npm run pr:check` aprovado, ou comandos equivalentes registrados com resultados.
- Staging migrado e validado com `npm run test:db` e smoke/E2E.
- Secrets e env vars de producao conferidos no Vercel.
- Supabase de producao com backup, migration aplicada e RLS validado.
- Crons Vercel cadastrados, protegidos por `CRON_SECRET` e testados.
- Reset de senha validado com Mailjet ou fallback documentado.
- API keys, webhooks/outbox, financeiro, juridico/SLA e notifications validados em ambiente deployado.
- Runbook e README/API atualizados para qualquer mudanca operacional remanescente.
- Plano de rollback e responsaveis de plantao definidos.
