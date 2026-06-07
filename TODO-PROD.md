# TODO-PROD

Checklist canonica de go-live da intranet ASOF. Itens historicos ja executados
permanecem aqui apenas quando ainda orientam operacao ou auditoria; evidencias
pontuais antigas ficam em `docs/operations/archive/`.

Atualizado em 2026-06-07. Última verificação de gates locais: 2026-06-07.

## Decisao Atual

- Banco de producao: PostgreSQL gerenciado novo, inicialmente limpo.
- Fonte canonica de schema: `src/lib/db/schema` + historico Drizzle em `drizzle/postgres/` iniciado pelo baseline `0000_green_glorian.sql`.
- Auth: server-side propria, `admins.password_hash`, cookie `httpOnly` assinado por `SESSION_SECRET`, `requireAuth()` e `requireRole()`.
- Seed inicial: `INITIAL_ADMIN_EMAIL` + `INITIAL_ADMIN_PASSWORD`, sempre com `must_change_password=true`.
- Notificacao: alerta persistido. Entrega em tempo real nao bloqueia o go-live.
- Documentos/storage: fora do caminho critico ate escolha separada de storage de objetos privado.
- RLS: fora do gate do dia 1; a barreira de seguranca e app server + credenciais PostgreSQL restritas + LGPD.

## Bloqueantes

- [x] Provisionar PostgreSQL gerenciado novo — Neon (intranet-db, `ep-empty-cake-ac26vl6w`, sa-east-1).
- [x] Configurar `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`, `CRON_SECRET`, `TRUSTED_PROXY_COUNT=1` e `ASOF_INTEGRATIONS_ENABLED=false` no Vercel (produção). Concluído em 2026-05-26.
  - [x] `SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`, `CRON_SECRET`, `TRUSTED_PROXY_COUNT=1` e `ASOF_INTEGRATIONS_ENABLED=false` existem em produção.
  - [x] `DATABASE_URL` e `DATABASE_MIGRATION_URL` foram reconfigurados via Vercel API com URLs Neon (`ep-empty-cake-ac26vl6w`) e fallbacks legados de banco foram removidos de produção.
- [x] Confirmar rotação de segredos robustos: `SESSION_SECRET` e `ENCRYPTION_MASTER_KEY` gerados com `openssl rand -hex 32` (64 hex chars = 32 bytes de entropia). `CRON_SECRET` rotacionado no mesmo ciclo.
- [x] Aplicar baseline em banco vazio:
  - `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` — concluído em 2026-05-26 contra Neon produção.
  - [x] `ALLOW_PRODUCTION_MIGRATIONS` não foi adicionado ao ambiente Vercel — deve ser passado só na execução pontual de migrate.
- [x] Rodar seed inicial — admin `gabriel@asof.org.br` criado com `must_change_password=true`.
- [x] Admin gabriel.org.br seedado no Neon com must_change_password=true.
- [x] Login do admin validado em producao: gabriel.org.br acessou intranet.asof.com.br com redirect para troca de senha obrigatoria.
- [x] Troca de senha obrigatoria realizada pelo admin apos primeiro login. (gabriel@asof.org.br → nova senha definida em 2026-05-26 via intranet.asof.com.br/change-password)
- [x] Rodar gates locais — `typecheck`, `lint`, `test` (1154 testes): todos passaram em 2026-06-07.
- [x] Rodar `npm run test:db` contra Neon produção antes do go-live — schema contract passou em 2026-05-26.
- [ ] Fazer smoke manual em producao, em janela controlada, antes de ampliar acesso operacional (ADR 009):
  - pre-janela: snapshot Neon e rollback documentado.
  - smoke: login do admin inicial + troca obrigatoria de senha, dashboard, associados, atividades, juridico, oficios, financeiro, auditoria, reset de senha e notificacoes persistidas.
  - pos-smoke: limpeza dos dados marcados (`SMOKE_*`) via SQL direto antes da liberacao; auditoria preservada.
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
- [x] Rodar `npm audit` — 0 vulnerabilidades em 2026-05-26.
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

### Roteiro de Smoke Manual

**Pre-requisitos:** snapshot Neon anotado, canal de incidente pronto, owner primario disponivel.

**1. Login e Sessão**
- [ ] Acessar `https://intranet.asof.com.br` — redirect para `/login`.
- [ ] Fazer login como `gabriel@asof.org.br` (senha pos-troca).
- [ ] Confirmar redirect para `/app` (dashboard).
- [ ] Verificar cookie `httpOnly` assinado presente.

**2. Dashboard**
- [ ] Dashboard carrega com dados. Verificar widgets: total de associados, financeiro, atividades.
- [ ] Notificacao de boas-vindas ou persistida visivel.

**3. Associados**
- [ ] Criar associado `SMOKE_NOME_FULL` com dados marcados (nome: `SMOKE_ Teste Go-Live`, email: `smoke@asof.org.br`).
- [ ] Editar associado criado.
- [ ] Buscar associado por nome.
- [ ] Confirmar dados sensiveis (CPF, SIAPE) visiveis para admin autenticado.

**4. Atividades (Kanban)**
- [ ] Criar atividade com titulo `SMOKE_ Atividade Teste`.
- [ ] Mover atividade entre colunas.
- [ ] Adicionar comentario.

**5. Juridico/Consultas**
- [ ] Criar consulta `SMOKE_ Consulta Teste`.
- [ ] Associar ao associado `SMOKE_NOME_FULL`.
- [ ] Avancar status.

**6. Financeiro/Mensalidades**
- [ ] Registrar mensalidade para `SMOKE_NOME_FULL`.
- [ ] Verificar status de contribuicao.
- [ ] Gerar relatorio financeiro (CSV).

**7. Oficios**
- [ ] Gerar oficio com modelo padrao.
- [ ] Confirmar PDF gerado.

**8. Auditoria**
- [ ] Verificar `audit_logs` — acoes do smoke registradas (login, criacao de associado, etc.).
- [ ] Navegar para pagina de auditoria.

**9. Notificacoes**
- [ ] Verificar central de notificacoes (sino).
- [ ] Notificacao de teste persistida visivel.

**10. Reset de Senha**
- [ ] Solicitar reset de senha para `smoke@asof.org.br`.
- [ ] Confirmar email enviado (Mailjet).

**Pos-smoke:** revisar os registros candidatos e executar SQL de limpeza no Neon
(via console Neon ou `psql` com `DATABASE_MIGRATION_URL`). Auditoria deve ser preservada.
```sql
BEGIN;

-- Atividades
DELETE FROM activities WHERE title ILIKE 'SMOKE_%';

-- Consultas juridicas e notas vinculadas
DELETE FROM legal_notes
  WHERE entity_type = 'consultation'
    AND entity_id IN (
      SELECT id FROM legal_consultations WHERE title ILIKE 'SMOKE_%'
    );
DELETE FROM legal_consultations WHERE title ILIKE 'SMOKE_%';

-- Oficios
DELETE FROM oficios WHERE subject ILIKE 'SMOKE_%';

-- Mensalidades do associado smoke
DELETE FROM monthly_payments
  WHERE associate_id IN (
    SELECT id FROM associates WHERE full_name ILIKE 'SMOKE_%'
  );

-- Notificacoes de smoke
DELETE FROM notifications WHERE message ILIKE '%SMOKE_%';

-- Associados de smoke
DELETE FROM associates WHERE full_name ILIKE 'SMOKE_%';

-- audit_logs e preservado integralmente por exigencia do ADR 009 — nao apagar.
-- Trocar ROLLBACK por COMMIT somente depois de revisar as linhas candidatas.
ROLLBACK;
```
_Nota: `audit_logs` e preservado (ADR 009). Se necessario identificar registros de smoke posteriormente, usar tag `SMOKE_` na descricao e consultar por ela, sem deletar._

## Evidencia Desta Frente

- Removidos helpers/scripts operacionais de Auth externa, entrega em tempo real externa e storage externo.
- Criado baseline inicial `drizzle/postgres/0000_green_glorian.sql`; migrações incrementais atuais seguem o historico em `drizzle/postgres/` e o journal Drizzle.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e` e `npm audit` passaram apos a troca para auth propria.

### Melhorias pós-go-live (2026-06-07)

- **Error handling unificado:** `src/lib/errors/` — hierarquia `DomainError` com `NotFoundError`, `ValidationError`, `RateLimitError`, `ExternalServiceError`, `UnauthorizedError`; `toSafeErrorLog` em todas as error boundaries; handlers globais de crash (`unhandledRejection` + `uncaughtException` com `process.exit(1)`) registrados via `src/instrumentation.ts`.
- **Error boundaries completos:** `error.tsx` em todas as rotas autenticadas; `not-found.tsx` em todas as rotas dinâmicas com `notFound()`.
- **Logging estruturado:** eliminado `console.error` direto em route handlers e server actions; PII nunca exposta em mensagens de erro retornadas ao cliente.
- **PAGES.md reescrito:** documentação completa de todas as páginas com funções, requisitos funcionais (checklists) e diagramas Mermaid (fluxo de autenticação, mapa de navegação, sequência de integrações).
- Gates locais: `typecheck` ✓ · `lint` ✓ · `test` 1154/1154 ✓ · autoreview Codex clean ✓ (2026-06-07).

Este arquivo substitui as pendencias antigas de smoke de tempo real e reconciliacao de projetos de banco. Elas nao sao mais caminho de go-live.
