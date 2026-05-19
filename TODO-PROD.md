# TODO-PROD

Goal criado em 2026-05-19 para fechar o caminho de producao da intranet ASOF.

## Goal

Levar o app para producao com uma fila limpa de PRs/branches, sem frentes abandonadas confundindo o estado do projeto, e com um checklist final que cubra codigo, banco, seguranca, deploy e operacao.

## Snapshot Atual

- Repositorio: `prof-ramos/intranet`
- Branch local atual: `main` (limpo apos cleanup)
- PRs merged: #55, #56, #57 (todas em main)
- Worktrees: somente `main` (worktrees antigos removidos)
- Branches limpas: 11 branches e 3 worktrees antigos deletados
- Guarded-migrate.ts salvo do worktree issue-41-hardening e commitado

## Triagem De PRs

| PR | Branch | Estado | Acao |
|---|---|---|---|
| #57 | `fix/followup-security-hardening` | Merged 2026-05-19 | ✅ Branch remota/local deletada |
| #56 | `fix-e2e-websocket-node20` | Merged 2026-05-19 | ✅ Branch remota/local deletada |
| #55 | `fix-security-medium-issues` | Merged 2026-05-19 | ✅ Branch remota/local deletada |

## Triagem De Branches — CONCLUIDO

Todas as branches antigas foram removidas:
- ✅ `dev/feature-delivery`, `docs/feature-docs`, `review/feature-review`, `test/feature-tests` (mesmo commit antigo 7b3777f)
- ✅ `worktree-db-quality-improvements`, `worktree-docs-improve-architecture`
- ✅ `docs/security-audit-2026-05-19`, `feat/listmonk-integration`, `feat/webhook-secrets-hardening`
- ✅ `codex/go-live-policy-dashboard`, `codex/issue-41-hardening`
- ✅ Worktrees prunable removidos (issue-41-hardening, codex/4cb3, codex/f117)
- ✅ `git worktree prune` executado — somente `main` permanece

## Plano Final Para Producao

### Fase 1 - Fechar Codigo Critico ✅

- [x] Aguardar todos os checks da PR `#57`.
- [x] Rodar/confirmar localmente `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:db` e `npm run build`.
- [x] Validar manualmente o fluxo de reset de senha sem `action_link`/`hashed_token` e confirmar que falha de modo explicito.
- [x] Mergear `#57` em `main`.
- [x] Atualizar `main` local.

### Fase 2 - Limpar Branches E PRs ✅

- [x] Apagar branches remotas ja resolvidas: `fix-e2e-websocket-node20`, `fix-security-medium-issues`, `fix/followup-security-hardening`.
- [x] Apagar branches locais antigas (9 branches removidas).
- [x] Salvar guarded-migrate.ts do worktree issue-41-hardening antes de destruir.
- [x] Remover worktrees e rodar `git worktree prune`.
- [x] Confirmar `git status --short --branch` limpo na `main`.

### Fase 3 - Banco E Supabase

- [ ] Confirmar alvo oficial de producao Supabase: `vmohxhyfgywaqfuqeuom` (`db-intranet`).
- [ ] Confirmar que previews/staging usam Supabase separado e nunca o banco de producao.
- [ ] Fazer backup/snapshot antes de qualquer migration.
- [ ] Conferir drift remoto: tabelas esperadas, ausencia de tabelas extras indevidas, extensoes e enums.
- [ ] Aplicar migrations no remoto correto com `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` (guarded-migrate bloqueia sem essa flag).
- [ ] Rodar `npm run test:db` **apenas contra staging/replica** que ja recebeu as migrations. Nunca contra producao diretamente — testes de schema tocam em estrutura, nao em dados de aplicacao, mas o risco de side effects e inaceitavel em producao.
- [ ] Confirmar RLS habilitado e FORCE RLS nas tabelas sensiveis, incluindo `notifications`.
- [ ] Detectar queries N+1 em rotas criticas (listagem de oficios, dashboard). Rodar EXPLAIN ANALYZE nas queries principais de producao e confirmar uso de indices. Verificar que tabelas com FORCE RLS (incluindo `notifications`) nao geram sequential scans em tabelas grandes.

### Fase 4 - Configuracao De Producao

- [ ] Revisar env vars obrigatorias na Vercel: banco, Supabase, auth/session, Mailjet se usado, integracoes desligadas por padrao.
- [ ] **ADICIONAR env vars faltantes em producao** (identificado na revisao G003):
  - `ENCRYPTION_MASTER_KEY` — obrigatorio para PII encryption (gerar com `openssl rand -hex 32`)
  - `MAILJET_API_KEY` + `MAILJET_SECRET_KEY` — obrigatorio para reset de senha por email (obter em app.mailjet.com)
  - `CRON_SECRET` — obrigatorio para production cron dispatch (gerar com `openssl rand -hex 32`)
  - `TRUSTED_PROXY_COUNT=1` — recomendado para rate limiting correto (Vercel tem 1 proxy)
  - **NOTA**: Supabase vars NAO estao faltando — `getSupabaseUrl()`, `getSupabasePublishableKey()` e `getSupabaseServiceRoleKey()` tem fallbacks que ja estao em producao (`DATABASE_SUPABASE_*` e `NEXT_PUBLIC_DATABASE_SUPABASE_*`)
  - Executar `bash scripts/setup-production-env.sh` para adicionar as vars auto-geradas
- [ ] Garantir `ASOF_INTEGRATIONS_ENABLED=false` para o primeiro go-live, salvo decisao explicita.
- [ ] Confirmar `SKIP_AUTH` desligado em producao.
- [ ] Conferir que previews nao usam secrets de producao.
- [ ] Rotacionar segredos **sempre que** qualquer uma destas condicoes for verdadeira: (1) secrets foram commitados no historico Git, (2) compartilhados via chat/email/ferramenta de colaboracao, (3) apareceram em logs de CI/CD ou Vercel, ou (4) estao em uso ha mais de 90 dias. Nao esperar por "risco de exposicao" vago — verificar historico Git e logs como parte desta checklist.
- [ ] Confirmar Framework Preset da Vercel como Next.js.
- [ ] Validar protecao contra brute-force em `/login` e endpoints de API (rate limiting configurado e ativo).
- [ ] Confirmar CORS: `Access-Control-Allow-Origin` nao pode ser `*` em producao.
- [ ] Confirmar Content-Security-Policy header presente e endurecido.
- [ ] Configurar observability/error-tracking: logs estruturados e Sentry/DataDog (ou equivalente) ativo antes do go-live.

### Fase 5 - Deploy E Smoke Test

- [ ] Promover o deployment aprovado para producao.
- [ ] Validar `/`, `/login`, `/app`, dashboard, associados, juridico e oficios.
- [ ] Validar login real com usuario admin/diretoria/secretaria.
- [ ] **Testar RLS com usuario comum** tentando acessar via API dados de outro usuario — verificar resposta 403 ou vazia.
- [ ] **Testar autorizacao**: tentar acessar rotas de admin com usuario `secretaria` e confirmar bloqueio.
- [ ] **Testar recuperacao de senha end-to-end** com envio de email real.
- [ ] Confirmar que dados LGPD nao aparecem em logs, erros de API ou respostas publicas. Verificar especificamente: CPF (padrao XXX.XXX.XXX-XX), email completo, telefone, endereco completo, hashes/senhas e tokens de sessao completos. Registrar queries e resultados como evidencia.
- [ ] Confirmar download de oficio e rotas protegidas sem vazamento de detalhe sensivel.
- [ ] Conferir logs Vercel e Supabase por erros de auth, migration, RLS e timeout.

### Fase 6 - Pos-Go-Live

- [ ] Registrar data/hora, commit SHA, migration aplicada e deployment URL.
- [ ] Monitorar erros por **72 horas (3 dias uteis)** — cobrir picos de uso, acumulo de cache, execucao de jobs agendados e comportamento sob carga real.
- [ ] **Documentar procedimento de rollback**: reverter deployment Vercel + rollback de migrations se necessario.
- [ ] **Manter janela de 1-2h com equipe disponivel** para rollback imediato apos deploy.
- [ ] **Configurar alertas criticos** (error rate > 5%, p95 latency > 2s, RLS violations) antes do go-live.
- [ ] Criar issues separadas para Listmonk, webhooks, dashboards adicionais e UX pendente.
- [ ] Remover branches/worktrees restantes apos o periodo de estabilizacao.
- [ ] Atualizar `README.md` e `docs/runbook.md` se algum passo operacional mudou.

## Comandos De Apoio

```bash
git fetch --all --prune
gh pr list --state open
git branch -vv --all
git worktree list --porcelain
git status --short --branch
npm run db:migrate          # com guardrail contra producao
ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate  # apenas apos backup/snapshot
```

## Definicao De Pronto

- Nenhuma PR aberta bloqueando producao.
- `main` com checks verdes.
- Branches antigas classificadas e limpas.
- Banco de producao reconciliado e com migrations aplicadas no alvo correto.
- Deploy de producao validado por smoke test.
- Runbook e registro operacional atualizados.
- Rollback procedimento documentado e equipe disponivel.