# TODO-PROD

Checklist canonica de go-live da intranet ASOF. Itens historicos ja executados
permanecem aqui apenas quando ainda orientam operacao ou auditoria; evidencias
pontuais antigas ficam em `docs/operations/archive/`.

Atualizado em 2026-06-23. Última verificação de gates locais: 2026-06-23.

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
- [x] Rodar gates locais — `lint`, `typecheck`, `test` (1535 testes) e `build`: todos passaram em 2026-06-23 (branch `chore/codebase-cleanup`).
- [x] Rodar `npm run test:db` contra Neon produção antes do go-live — schema contract passou em 2026-05-26.
- [x] Smoke test automatizado de producao implementado e validado (ADR 009):
  - Spec E2E Playwright (`e2e/smoke-prod.spec.ts`) cobre login, dashboard, associados, atividades, juridico, oficios, financeiro, auditoria, notificacoes e reset de senha.
  - Executa contra `intranet.asof.com.br` com dados marcados `SMOKE_*`.
  - Pos-smoke: SQL de limpeza automatico remove dados de teste; `audit_log` preservado.
  - CI/CD: job `smoke-prod` roda apenas em push para `main` com credenciais de ambiente.
- [x] Validar crons com `CRON_SECRET` antes de ativar operacao.
- [x] Confirmar que previews/staging nao apontam para banco de producao — envs gerais de banco foram removidos do ambiente Preview no Vercel em 2026-05-26; restam apenas `SESSION_SECRET` em Preview e `GEMINI_API_KEY` restrita ao branch `feature/outbound-integrations-webhooks`.

## Recomendado Antes Do Go-Live

- [x] Documentos fora do go-live: modulo de upload/download de arquivos legados nao entra no dia 1 (ADR 008). Storage de objetos sera frente separada pos-estreia.
- [ ] Avaliar Papra como DMS externo para Documentos da ASOF, mantendo Neon/PostgreSQL como banco transacional da intranet — frente pos-estreia, nao bloqueante para operacao atual; ADR 012 aceita; implementacao/spike rastreada pela issue: https://github.com/prof-ramos/intranet/issues/116.
  - [ ] Subir prova de conceito self-hosted do Papra em VPS isolada, com banco, storage e auth/admin separados da intranet.
  - [ ] Restringir exposicao da VPS: Papra nao deve ser interface publica; API/endpoint apenas para a intranet e administracao via VPN ou allowlist de IP, com TLS.
  - [ ] Definir backend de storage privado para documentos do Papra com software open source e self-hosted, preferencialmente S3 compativel (ex: MinIO ou Garage); evitar filesystem local simples e servico proprietario gerenciado na POC.
  - [ ] Validar upload manual pela intranet como canal operacional inicial.
  - [ ] Validar ingestao por email/webhook apenas como entrada tecnica para triagem, sem criar Documento valido fora da autorizacao/auditoria da intranet.
  - [ ] Validar OCR/extracao de conteudo, busca full-text contextual, tags, propriedades customizadas e auditoria basica.
  - [ ] Confirmar API/SDK/webhooks e capacidade de integrar com a intranet como fonte canônica de autorização, sem expor documentos sensiveis publicamente.
  - [ ] Integrar a intranet ao Papra apenas por chamadas server-to-server, com token de servico/API key de escopo minimo guardado em ambiente server-side.
  - [ ] Validar experiencia de uso em que a intranet lista, audita e medeia acesso aos Documentos, sem exigir navegacao operacional direta no Papra.
  - [ ] Separar auditoria de negocio e logs tecnicos da integracao: a intranet registra quem acessou qual Documento e os logs tecnicos registram chamadas ao Papra com `requestId`, acao e resultado, sem conteudo sensivel.
  - [ ] Validar busca contextual por módulo/entidade; busca global de Documentos fica fora da POC inicial.
  - [ ] Dividir ownership de metadados: a intranet e canonica para metadados de dominio/autorizacao (`papraDocumentId`, tipo, entidade relacionada opcional, autor, datas, tags internas e status) e o Papra e canonico para metadados tecnicos do arquivo (MIME, tamanho, hash, OCR e timestamps tecnicos).
  - [ ] Validar Documentos Vinculados e Documentos de Acervo, sem forcar vinculos artificiais.
  - [ ] Definir tratamento de falha parcial: se a intranet salvar metadados locais e o upload no Papra falhar, o registro fica em estado explicito de falha pendente (`upload_failed` ou `pending_external_sync`), visivel apenas para `admin`/`secretaria`, com retry manual; Documento valido nao nasce pela metade.
  - [ ] Validar ciclo de vida com arquivamento/desativacao como fluxo normal e expurgo fisico apenas como excecao LGPD/erro grave auditada e restrita a `admin`.
  - [ ] Definir baseline operacional da POC: backup diario do banco do Papra por 14 dias, snapshot/versionamento do storage por 30 dias e restore simples testado ao menos uma vez em ambiente separado.
  - [ ] Documentar a criptografia em repouso fornecida pelo stack/storage escolhido e seus limites; a POC nao adiciona camada extra propria de criptografia.
  - [ ] Revisar implicacoes de LGPD, backup, retencao, exportacao e licencas open source (incluindo AGPL-3.0 quando aplicavel) antes de qualquer uso em producao.
- [x] Rodar `npm audit` — 1 vulnerabilidade transitiva (esbuild em dev via drizzle-kit/tsx) em 2026-06-23; nao afeta producao. CVEs de ws/@novu/react eliminadas com remocao da dependencia. Fix do esbuild requer breaking change (drizzle-kit downgrade), portanto monitorar advisories.
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

**Pre-requisitos:** `SMOKE_ADMIN_EMAIL` e `SMOKE_ADMIN_PASSWORD` configurados como secrets do GitHub Actions.

**Execucao manual (local):**
```bash
SMOKE_ADMIN_EMAIL=gabriel@asof.org.br SMOKE_ADMIN_PASSWORD='...' npm run smoke:prod
```

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
- Gates locais: `lint` ✓ · `typecheck` ✓ · `test` 1535/1535 ✓ · `build` ✓ (2026-06-23, branch `chore/codebase-cleanup`).

Este arquivo substitui as pendencias antigas de smoke de tempo real e reconciliacao de projetos de banco. Elas nao sao mais caminho de go-live.
