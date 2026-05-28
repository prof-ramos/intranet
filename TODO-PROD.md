# TODO-PROD

Checklist canonica de go-live da intranet ASOF.

Atualizado em 2026-05-26 apos decisao de resetar a camada de banco/autenticacao para PostgreSQL gerenciado limpo, com baseline Drizzle novo e auth propria.

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
- [x] Rodar gates locais — `typecheck`, `lint`, `test` (824 testes): todos passaram em 2026-05-26.
- [x] Rodar `npm run test:db` contra Neon produção antes do go-live — schema contract passou em 2026-05-26.
- [ ] Fazer smoke manual em producao, em janela controlada, antes da liberacao para usuarios finais (ADR 009):
  - pre-janela: snapshot Neon e rollback documentado.
  - smoke: login do admin inicial + troca obrigatoria de senha, dashboard, associados, atividades, juridico, oficios, financeiro, auditoria, reset de senha e notificacoes persistidas.
  - pos-smoke: limpeza dos dados marcados (`SMOKE_*`) via SQL direto antes da liberacao; auditoria preservada.
- [ ] Validar crons com `CRON_SECRET` antes de ativar operacao.
- [x] Confirmar que previews/staging nao apontam para banco de producao — envs gerais de banco foram removidos do ambiente Preview no Vercel em 2026-05-26; restam apenas `SESSION_SECRET` em Preview e `GEMINI_API_KEY` restrita ao branch `feature/outbound-integrations-webhooks`.

## Recomendado Antes Do Go-Live

- [x] Documentos fora do go-live: modulo de upload/download de arquivos legados nao entra no dia 1 (ADR 008). Storage de objetos sera frente separada pos-estreia.
- [ ] Avaliar Papra como DMS externo para Documentos da ASOF, mantendo Neon/PostgreSQL como banco transacional da intranet — frente pos-estreia, nao bloqueante para go-live; ADR 012 proposta; issue: https://github.com/prof-ramos/intranet/issues/93.
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

## Gate Pre-Janela

Marcar a janela de go-live (ADR 009) somente quando todos os itens abaixo estiverem verdes. Confirmar item a item com o owner primario antes de comunicar a Diretoria.

- [ ] ADRs 007, 008, 009, 010 e 011 lidos e aceitos pelos owners primario e substituto.
- [ ] `history_retention` do projeto Neon `intranet-db` confirmado como suficiente para cobrir a janela + 24h (ADR 010); upgrade de tier feito antes da janela se necessario.
- [ ] Procedimento de anotacao de timestamp/LSN pre-janela combinado com o owner primario (ADR 010).
- [ ] Canal unico de incidente criado e populado com owner primario, substituto e DPO (ou Diretoria acumulando o papel) (ADR 011).
- [ ] Versao de producao Vercel marcada como "ultima conhecida boa" para redeploy em caso de rollback (ADR 010).
- [ ] Roteiro de smoke escrito como lista de passos (com dados marcados `SMOKE_*`) e revisado pelo owner primario (ADR 009).
- [ ] Janela aprovada pela Diretoria com data, hora UTC e duracao estimada registradas.

## Evidencia Desta Frente

- Removidos helpers/scripts operacionais de Auth externa, entrega em tempo real externa e storage externo.
- Criado baseline inicial `drizzle/postgres/0000_green_glorian.sql`; migrações incrementais atuais seguem em `drizzle/postgres/0001_living_hobgoblin.sql` e `drizzle/postgres/0002_fix_assignment_type_enum_labels.sql`.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e` e `npm audit` passaram apos a troca para auth propria.

Este arquivo substitui as pendencias antigas de smoke de tempo real e reconciliacao de projetos de banco. Elas nao sao mais caminho de go-live.
