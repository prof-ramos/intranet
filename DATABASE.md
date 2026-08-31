# Database — ASOF Intranet

> Schema reference e guia operacional do banco de dados.
> Última atualização: 2026-06-18 (ADR 015: matriz oficial de ambientes)

---

## Stack

- **Provider:** Neon Postgres (serverless)
- **ORM:** Drizzle ORM (`drizzle-orm` + `postgres-js`)
- **Migrações:** Drizzle Kit (`drizzle-kit`), SQL versionado em `drizzle/postgres/`
- **Schema:** `src/lib/db/schema/` (um arquivo por domínio)

---

## Conexão

A matriz oficial de ambientes fica em [`docs/environments.md`](./docs/environments.md).
Este arquivo descreve o schema e o workflow de banco, mas não deve introduzir
novos ambientes.

| Ambiente              | Variável                                  | Descrição                                                                                 |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Produção (Runtime)    | `DATABASE_URL`                            | Pooled (Neon pooler) — `ep-empty-cake-ac26vl6w-pooler.sa-east-1.aws.neon.tech`            |
| Produção (Migrations) | `DATABASE_MIGRATION_URL`                  | Direta (Neon direct) — `ep-empty-cake-ac26vl6w.sa-east-1.aws.neon.tech`                   |
| Dev diário            | `DATABASE_URL` / `DATABASE_MIGRATION_URL` | Postgres local `asof_intranet` com seed sintético                                         |
| Dev realista restrito | `DATABASE_URL` / `DATABASE_MIGRATION_URL` | Neon `vercel-dev` ou clone local autorizado com PII real, apenas por necessidade concreta |
| Testes                | `TEST_DATABASE_URL` ou `.env.test.local`  | Bancos locais dedicados (`asof_test`, `asof_intranet_test`)                               |

O cliente Drizzle (`src/lib/db/index.ts`) ainda reconhece fallbacks legados para
compatibilidade de provedores e desenvolvimento, mas produção oficial deve usar
somente `DATABASE_URL` + `DATABASE_MIGRATION_URL`.

### Desenvolvimento local

- **Padrão:** banco local `asof_intranet` + `npm run db:seed`, sem PII real.
- **Restrito:** Neon `vercel-dev` ou clone local com dados reais apenas para
  bugs de volume, importação, performance e validações que dependem de dados
  realistas. Trate como PII sensível e siga `docs/environments.md`.
- Sempre use URLs locais sem `sslmode=require` no Postgres local e usuário do
  sistema (ex: `postgres://gabrielramos@localhost:5432/asof_intranet`).
- Testes de integração e E2E usam bancos dedicados separados (`asof_intranet_test`, `asof_test`).

### Configuração do client

```typescript
max: 10
max_lifetime: 1800s
statement_timeout: 30000ms
application_name: 'asof-intranet'
ssl: 'require' em produção
prepare: false quando detecta pooler (pgbouncer/6543/pooler.*)
```

---

## Migrações

### Workflow

```bash
npm run db:generate   # gera migração a partir do schema (drizzle-kit generate)
npm run db:migrate    # aplica migrações com guardrails de segurança
npm run db:seed       # insere admin inicial (INITIAL_ADMIN_EMAIL/PASSWORD)
npm run db:studio     # Drizzle Studio (navegador)
```

### Guardrails

`npm run db:migrate` bloqueia automaticamente:

- `DATABASE_MIGRATION_ENV=production`
- `VERCEL_ENV=production`
- Hostnames que parecem produção
- Alvos remotos quando `NODE_ENV=production`

Para migração manual em produção:

```bash
ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate
```

> Executar apenas após backup/snapshot, janela aprovada e plano de rollback documentado.

Staging, quando existir oficialmente, deve usar `DATABASE_MIGRATION_ENV=staging`,
`ALLOW_STAGING_MIGRATIONS=true` no workflow controlado e secrets próprios.
Preview não deve herdar envs gerais de banco de produção.

### Índices CONCURRENTLY

`CREATE INDEX CONCURRENTLY` e `DROP INDEX CONCURRENTLY` **não** podem ser executados dentro de transações PostgreSQL. Como o Drizzle Kit (`npm run db:migrate`) aplica migrações envolvendo cada statement em uma transação, esses comandos falham nesse fluxo. Para esses casos: backup → teste em staging → execução direta via `psql "$DATABASE_MIGRATION_URL"` → validação com `npm run test:db`.

### Migrações aplicadas (29)

Contagem = número de entradas em `drizzle/postgres/meta/_journal.json` (fonte de verdade), não a listagem do diretório.

| #    | Arquivo                                              | Descrição                                                                                                                        |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 0000 | `0000_green_glorian.sql`                             | Baseline inicial                                                                                                                 |
| 0001 | `0001_living_hobgoblin.sql`                          | Ajustes pós-baseline                                                                                                             |
| 0002 | `0002_fix_assignment_type_enum_labels.sql`           | Correção de labels enum assignment_type                                                                                          |
| 0003 | `0003_same_shen.sql`                                 | Ajustes diversos                                                                                                                 |
| 0004 | `0004_add_integration_api_key_signing_secret.sql`    | Segredo HMAC por chave de API                                                                                                    |
| 0005 | `0005_add_assinafy_oficios.sql`                      | Integração Assinafy                                                                                                              |
| 0006 | `0006_add_lgpd_request_notification_type.sql`        | Tipo de notificação LGPD                                                                                                         |
| 0007 | `0007_email_triage_mvp.sql`                          | Módulo de triagem de email                                                                                                       |
| 0008 | `0008_mute_the_twelve.sql`                           | Ajustes diversos                                                                                                                 |
| 0009 | `0009_email_triage_notifications.sql`                | Notificações de triagem de email                                                                                                 |
| 0010 | `0010_relax_email_triage_operational_review.sql`     | Relaxa validações operacionais de triagem                                                                                        |
| 0011 | `0011_lawyers_name_trgm.sql`                         | Índice GIN trigram em lawyers.name                                                                                               |
| 0012 | `0012_password_reset_tokens.sql`                     | Tabela password_reset_tokens                                                                                                     |
| 0013 | `0013_admin_session_version.sql`                     | Coluna session_version em admins                                                                                                 |
| 0014 | `0014_rename_oficios_unique_constraint.sql`          | Renomeia constraint unique de oficios                                                                                            |
| 0015 | `0015_greedy_robin_chapel.sql`                       | lawyer_id e thread_id em legal_consultations                                                                                     |
| 0016 | `0016_add_assinafy_signing_url.sql`                  | Coluna assinafy_signing_url em oficios                                                                                           |
| 0017 | `0017_expand_domain_events_and_assinafy.sql`         | Expande domain_event_type; assinafy partially_signed                                                                             |
| 0018 | `0018_add_oficio_notification_types.sql`             | Tipos de notificação oficio                                                                                                      |
| 0019 | `0019_add_recipient_address_fields.sql`              | Campos de endereço do destinatário em oficios                                                                                    |
| 0020 | `0020_careless_penance.sql`                          | Expansão de associates (21 colunas, 4 enums, 2 tabelas)                                                                          |
| 0021 | `0021_military_thundra.sql`                          | Índice unique em source_row_number para upsert idempotente                                                                       |
| 0022 | `0022_puzzling_mantis.sql`                           | CHECK constraint em health_agreements (end_date ≥ start_date)                                                                    |
| 0023 | `0023_dashing_madame_web.sql`                        | Adiciona constraint `UNIQUE` em `assignments.name`                                                                               |
| 0024 | `0024_worthless_deathbird.sql`                       | Cria tabela `integration_signature_nonces` (prevenção de replay attack em integrações M2M)                                       |
| 0025 | `0025_officials_domain_statuses.sql`                 | Normaliza enums `association_status` e `contribution_status` (remove valores legados `ativo`, `pendente_migracao`)               |
| 0026 | `0026_add_associate_retirement_date.sql`             | Adiciona coluna `retirement_date` em associates                                                                                  |
| 0027 | `0027_add_associates_name_translated_trgm_index.sql` | Índice GIN trigram transliterado para busca de nome sem acentos                                                                  |
| 0028 | `0028_activity_domain_events.sql`                    | ADR 018: eventos de domínio `activity.*` no outbox (6 valores em `domain_event_type` + `activity` em `domain_event_entity_type`) |
| 0029 | `0029_pagination_count_index.sql`                    | Índice composto em associates para paginação otimizada                                                                           |

### Nomenclatura

Migrations seguem o padrão `NNNN_descricao.sql` com zero-padding de 4 dígitos. O arquivo `drizzle/postgres/meta/_journal.json` mantém o registro de quais migrações foram aplicadas.

---

## Schema (`src/lib/db/schema/`)

### Tabelas (31)

#### Core

| Tabela        | Arquivo          | Finalidade                                                                                                    |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `admins`      | `admins.ts`      | Usuários administrativos (login, roles, password_hash)                                                        |
| `associates`  | `associates.ts`  | Cadastro de Oficiais de Chancelaria (dados pessoais, PII, situação funcional, vínculo ASOF, dados funcionais) |
| `assignments` | `assignments.ts` | Lotações/postos (domestic/abroad)                                                                             |

#### Atividades

| Tabela       | Arquivo         | Finalidade                                  |
| ------------ | --------------- | ------------------------------------------- |
| `activities` | `activities.ts` | Quadro kanban de atividades administrativas |

#### Financeiro

| Tabela             | Arquivo      | Finalidade                                     |
| ------------------ | ------------ | ---------------------------------------------- |
| `monthly_payments` | `finance.ts` | Registros mensais de pagamento de mensalidades |

#### Associados (relacionamentos)

| Tabela              | Arquivo                | Finalidade                                   |
| ------------------- | ---------------------- | -------------------------------------------- |
| `dependents`        | `dependents.ts`        | Dependentes de associados (nome, parentesco) |
| `health_agreements` | `health-agreements.ts` | Convênios médicos por associado              |

#### Jurídico

| Tabela                | Arquivo                  | Finalidade                                |
| --------------------- | ------------------------ | ----------------------------------------- |
| `legal_consultations` | `legal-consultations.ts` | Consultas jurídicas (SLA, status)         |
| `legal_notes`         | `legal-notes.ts`         | Notas/interações em consultas e processos |
| `legal_processes`     | `legal-processes.ts`     | Processos jurídicos                       |
| `legal_opinions`      | `legal-opinions.ts`      | Pareceres jurídicos                       |
| `legal_opinion_tags`  | `legal-opinions.ts`      | Tags de pareceres                         |
| `lawyers`             | `lawyers.ts`             | Escritórios/advogados cadastrados         |

#### Secretaria

| Tabela      | Arquivo        | Finalidade                          |
| ----------- | -------------- | ----------------------------------- |
| `oficios`   | `oficios.ts`   | Ofícios (documentos oficiais, PDF)  |
| `documents` | `documents.ts` | Documentos institucionais (uploads) |

#### Email Triage

| Tabela           | Arquivo           | Finalidade                               |
| ---------------- | ----------------- | ---------------------------------------- |
| `email_triagens` | `email-triage.ts` | Triagem automática de emails (Gemini AI) |

#### Notificações

| Tabela          | Arquivo            | Finalidade                         |
| --------------- | ------------------ | ---------------------------------- |
| `notifications` | `notifications.ts` | Notificações persistidas (polling) |

#### Auditoria

| Tabela       | Arquivo    | Finalidade                              |
| ------------ | ---------- | --------------------------------------- |
| `audit_logs` | `audit.ts` | Eventos de auditoria (LGPD, compliance) |

#### Integrações

| Tabela                         | Arquivo           | Finalidade                                                                    |
| ------------------------------ | ----------------- | ----------------------------------------------------------------------------- |
| `domain_events`                | `integrations.ts` | Outbox de eventos de domínio                                                  |
| `webhook_subscriptions`        | `integrations.ts` | Subscriptions de webhooks outbound                                            |
| `webhook_deliveries`           | `integrations.ts` | Histórico de entregas de webhook                                              |
| `integration_api_keys`         | `integrations.ts` | Chaves de API M2M com escopos                                                 |
| `integration_signature_nonces` | `integrations.ts` | Nonces de replay attack (unique por `key_id` + `signature`, com `expires_at`) |

#### MCP de operador

| Tabela                | Arquivo         | Finalidade                                              |
| --------------------- | --------------- | ------------------------------------------------------- |
| `operator_mcp_tokens` | `mcp-tokens.ts` | PATs individuais de operadores para o control plane MCP |

| Coluna                 | Tipo          | Restrições / finalidade                                 |
| ---------------------- | ------------- | ------------------------------------------------------- |
| `id`                   | `int8`        | PK (`GENERATED ALWAYS AS IDENTITY`)                     |
| `admin_id`             | `int8`        | FK obrigatória para `admins.id` (`ON DELETE CASCADE`)   |
| `name`                 | `text`        | Nome dado pelo operador ao cliente/token                |
| `token_hash`           | `text`        | SHA-256 hex do PAT; único; plaintext nunca é persistido |
| `lgpd_acknowledged_at` | `timestamptz` | Data obrigatória da ciência LGPD                        |
| `last_used_at`         | `timestamptz` | Último uso autenticado, nullable                        |
| `expires_at`           | `timestamptz` | Expiração obrigatória, 90 dias após a emissão           |
| `revoked_at`           | `timestamptz` | Revogação, nullable                                     |
| `created_at`           | `timestamptz` | Data de criação                                         |

| Índice                                      | Tipo                                        | Finalidade                                  |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `idx_operator_mcp_tokens_token_hash_unique` | UNIQUE B-tree                               | Autenticação por hash do Bearer             |
| `idx_operator_mcp_tokens_admin_id`          | B-tree                                      | Listagem e revogação dos tokens do operador |
| `idx_operator_mcp_tokens_active`            | B-tree parcial (`WHERE revoked_at IS NULL`) | Tokens ainda revogáveis                     |

#### Segurança

| Tabela                    | Arquivo                      | Finalidade                                      |
| ------------------------- | ---------------------------- | ----------------------------------------------- |
| `login_attempts`          | `login-attempts.ts`          | Tentativas de login (rate limit)                |
| `rate_limits`             | `rate-limits.ts`             | Rate limiting PostgreSQL-backed                 |
| `password_reset_tokens`   | `password-reset-tokens.ts`   | Tokens de redefinição de senha com expiração    |
| `password_reset_attempts` | `password-reset-attempts.ts` | Rastreia tentativas de reset de senha por token |

#### Configuração

| Tabela         | Arquivo           | Finalidade                         |
| -------------- | ----------------- | ---------------------------------- |
| `app_settings` | `app-settings.ts` | Configurações globais da aplicação |

#### Métricas

| Tabela         | Arquivo           | Finalidade           |
| -------------- | ----------------- | -------------------- |
| `test_results` | `test-metrics.ts` | Resultados de testes |
| `test_runs`    | `test-metrics.ts` | Execuções de teste   |

### Views

| View                      | Arquivo    | Finalidade                  |
| ------------------------- | ---------- | --------------------------- |
| `vw_associates_dashboard` | `views.ts` | Agregações para o dashboard |

---

## Enums (39)

### Associados

| Enum                  | Valores                                                           | Uso                |
| --------------------- | ----------------------------------------------------------------- | ------------------ |
| `association_status`  | `associado`, `nao_associado`                                      | Vínculo ASOF       |
| `functional_status`   | `ativo`, `aposentado`, `cedido`, `em_licenca`                     | Situação funcional |
| `contribution_status` | `em_dia`, `inadimplente`                                          | Contribuição       |
| `assignment_type`     | `nacional`, `exterior`                                            | Tipo de lotação    |
| `sex`                 | `M`, `F`                                                          | Sexo biológico     |
| `marital_status`      | `solteiro`, `casado`, `divorciado`, `viuvo`, `separado`, `outros` | Estado civil       |
| `mission_type`        | `permanente`, `transitoria`                                       | Tipo de missão     |
| `career_origin`       | `brasil`, `exterior`, `outros_orgaos`                             | Origem de carreira |

### Financeiro

| Enum             | Valores                                               | Uso                   |
| ---------------- | ----------------------------------------------------- | --------------------- |
| `payment_method` | `folha`, `boleto`, `pix`, `transferencia`, `outros`   | Método de pagamento   |
| `payment_status` | `pago`, `pendente`, `atrasado`, `isento`, `cancelado` | Status da mensalidade |

### Atividades

| Enum                | Valores                                                        | Uso                   |
| ------------------- | -------------------------------------------------------------- | --------------------- |
| `activity_status`   | `a_fazer`, `em_andamento`, `aguardando_terceiros`, `concluido` | Status do card kanban |
| `activity_priority` | `baixa`, `normal`, `alta`, `urgente`                           | Prioridade            |

### Administração

| Enum         | Valores                            | Uso             |
| ------------ | ---------------------------------- | --------------- |
| `admin_role` | `admin`, `diretoria`, `secretaria` | Role de usuário |

### Jurídico

| Enum                        | Valores                                                      | Uso                  |
| --------------------------- | ------------------------------------------------------------ | -------------------- |
| `legal_consultation_status` | `aberta`, `aguardando_escritorio`, `respondida`, `arquivada` | Status da consulta   |
| `legal_process_status`      | `ativo`, `concluido`, `suspenso`                             | Status do processo   |
| `legal_process_type`        | `judicial`, `administrativo`                                 | Tipo de processo     |
| `legal_process_subtype`     | `justica_federal`, `stf`, `mre`, `cgu`, `tcu`                | Subtipo              |
| `legal_note_entity_type`    | `consultation`, `process`                                    | Entidade da nota     |
| `legal_satisfaction`        | `satisfeito`, `insatisfeito`, `sem_resposta`                 | Satisfação           |
| `lawyer_status`             | `ativo`, `inativo`                                           | Status do escritório |

### Ofícios

| Enum                       | Valores                                                                                                                                                                                                        | Uso              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `official_letter_status`   | `gerado`, `cancelado`, `rascunho`                                                                                                                                                                              | Status do ofício |
| `assinafy_document_status` | `uploading`, `uploaded`, `metadata_processing`, `metadata_ready`, `pending_signature`, `certificating`, `certificated`, `expired`, `partially_signed`, `rejected_by_signer`, `rejected_by_user`, `failed` (12) | Status Assinafy  |

### Documentos

| Enum                | Valores                                                                                                                     | Uso       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------- |
| `document_category` | `modelo_contrato`, `contrato`, `minuta`, `estatuto`, `ata`, `oficio`, `rh`, `evento`, `nota_fiscal`, `comprovante`, `outro` | Categoria |

### Email Triage

| Enum                   | Valores                                                                                                                                                                                                                                                    | Uso                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `email_status_triagem` | `novo`, `analisado`, `aguardando_validacao`, `validado`, `em_andamento`, `concluido`, `vencido`, `arquivado`, `erro_validacao_ia`, `erro_processamento_anexo`, `aguardando_reprocessamento`, `descartado_por_irrelevancia`, `pendente_validacao_lgpd` (13) | Status da triagem          |
| `email_categoria`      | `juridico`, `administrativo`, `financeiro`, `institucional`, `comunicacao`, `irrelevante`                                                                                                                                                                  | Classificação Gemini       |
| `email_confianca`      | `baixa`, `media`, `alta`                                                                                                                                                                                                                                   | Confiança da classificação |
| `email_nivel_risco`    | `baixo`, `medio`, `alto`, `critico`                                                                                                                                                                                                                        | Risco identificado         |
| `email_responsavel`    | `juridico`, `administrativo`, `financeiro`, `diretoria`                                                                                                                                                                                                    | Área responsável           |
| `email_tipo_prazo`     | `processual`, `administrativo`, `contratual`, `financeiro`, `reuniao`, `resposta`, `outro`                                                                                                                                                                 | Classificação de urgência  |

### Notificações

| Enum                       | Valores                                                                                                                                                                     | Uso                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `notification_type`        | `activity.completed`, `legal_consultation.answered`, `activity.assigned`, `legal_consultation.sla_warning`, `email_triage_pending`, `lgpd_request`, `oficio.status_changed` | Categoria            |
| `notification_entity_type` | `activity`, `legal_consultation`, `email_triagem`                                                                                                                           | Entidade relacionada |

### Auditoria

| Enum                | Valores                                                                                                                                                                                         | Uso                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `audit_entity_type` | `associate`, `admin`, `activity`, `assignment`, `legal_consultation`, `legal_process`, `finance`, `monthly_payment`, `official_letter`, `domain_event`, `webhook_subscription`, `document` (12) | Tipo de entidade auditada |

### Integrações

| Enum                           | Valores                                                                                                                                                                                                                                                                                                                                                         | Uso                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `domain_event_type`            | `associate.updated`, `legal_consultation.created`, `legal_consultation.status_changed`, `official_letter.created`, `official_letter.published`, `official_letter.status_changed`, `monthly_payment.updated`, `activity.created`, `activity.status_changed`, `activity.assigned`, `activity.completed`, `activity.priority_changed`, `activity.due_date_changed` | Categoria do evento  |
| `domain_event_entity_type`     | `associate`, `legal_consultation`, `official_letter`, `monthly_payment`, `activity`                                                                                                                                                                                                                                                                             | Entidade relacionada |
| `domain_event_delivery_status` | `pending`, `processing`, `delivered`, `partially_delivered`, `failed`                                                                                                                                                                                                                                                                                           | Status de entrega    |
| `webhook_delivery_status`      | `pending`, `delivered`, `failed`, `retry_scheduled`                                                                                                                                                                                                                                                                                                             | Status do delivery   |

### Métricas

| Enum                 | Valores                                                                      | Uso                  |
| -------------------- | ---------------------------------------------------------------------------- | -------------------- |
| `test_environment`   | `ci`, `local`                                                                | Ambiente de execução |
| `test_result_status` | `passed`, `failed`, `skipped`, `todo`, `timed_out`, `interrupted`, `unknown` | Status do teste      |
| `test_runner`        | `vitest`, `playwright`                                                       | Runner               |

---

## Índices

### Convenção

- **Prefixo:** `idx_` para índices customizados
- **Parciais:** para `WHERE` condicionais (ex: `WHERE status != 'concluido'`)
- **GIN trigram:** para `LIKE '%term%'` em campos de texto (`idx_*_name_trgm`)
- **Compostos:** para queries comuns de `(filter, order)` (ex: `idx_activities_status_due_date`)

### Destaques

| Tabela              | Índice                               | Tipo     | Finalidade                                         |
| ------------------- | ------------------------------------ | -------- | -------------------------------------------------- |
| `associates`        | `idx_associates_paginated_list`      | Composto | Listagem com paginação e ordenação                 |
| `associates`        | `idx_associates_name_trgm`           | GIN      | Busca textual por nome                             |
| `associates`        | `idx_associates_name_lower_trgm`     | GIN      | Busca textual por nome transliterado (sem acentos) |
| `associates`        | `idx_associates_cpf`                 | UNIQUE   | CPF único                                          |
| `associates`        | `idx_associates_siape`               | UNIQUE   | SIAPE único                                        |
| `associates`        | `idx_associates_primary_email`       | UNIQUE   | Email único                                        |
| `associates`        | `idx_associates_status_name`         | Composto | Listagem por status + nome                         |
| `associates`        | `idx_associates_rg_hash`             | B-tree   | Lookups por RG (blind index)                       |
| `monthly_payments`  | `idx_monthly_payments_unique`        | UNIQUE   | Um pagamento por (associate, year, month)          |
| `activities`        | `idx_activities_status_due_date`     | Composto | Kanban por status + data                           |
| `documents`         | `idx_documents_name_trgm`            | GIN      | Busca textual por nome                             |
| `documents`         | `idx_documents_description_trgm`     | GIN      | Busca textual por descrição                        |
| `lawyers`           | `idx_lawyers_name_trgm`              | GIN      | Busca textual por nome                             |
| `dependents`        | `idx_dependents_associate_id`        | B-tree   | FK lookup por associado                            |
| `health_agreements` | `idx_health_agreements_associate_id` | B-tree   | FK lookup por associado                            |

---

## PII e Criptografia

### Campos protegidos (LGPD)

`cpf`, `siape`, `email`, `phone`, `whatsapp`, `address`, `birthDate`, `rg`, `internalNotes`

### Helpers (`src/lib/crypto/`)

| Função            | Finalidade                              |
| ----------------- | --------------------------------------- |
| `encryptPii()`    | AES-256-GCM com HKDF para armazenamento |
| `piiBlindIndex()` | HMAC blind index para busca             |
| `sanitizePii()`   | Redação de PII em logs                  |

### Regras

- Plaintext nunca em logs, erros ou respostas de API
- Dados legados/importados em plaintext são risco operacional aceito, controlados via acesso ao Neon + auditoria
- Usuários autenticados da intranet têm visibilidade operacional integral de PII
- Campos RG seguem padrão triple-column: `rg` (plaintext, nullable) + `rgCiphertext` + `rgHash` com CHECK constraint (`rg IS NULL OR rgCiphertext IS NULL`)

### Colunas PII com triple-column pattern

| Campo plaintext | Ciphertext        | Blind index (hash) | CHECK constraint                               |
| --------------- | ----------------- | ------------------ | ---------------------------------------------- |
| `cpf`           | `cpfCiphertext`   | `cpfHash`          | `cpf IS NULL OR cpfCiphertext IS NULL`         |
| `siape`         | `siapeCiphertext` | `siapeHash`        | `siape IS NULL OR siapeCiphertext IS NULL`     |
| `email`         | `emailCiphertext` | `emailHash`        | `emailHash` (unique, não-null se email existe) |
| `rg`            | `rgCiphertext`    | `rgHash`           | `rg IS NULL OR rgCiphertext IS NULL`           |

---

## Convenções de Desenvolvimento

- **Enums:** sempre PostgreSQL `pgEnum`, nunca `text` para campos de status/tipo
- **Multi-tabela:** sempre `db.transaction()` — nunca deixar writes parciais
- **Índices:** parciais para filtros condicionais, GIN trigram para busca textual, compostos para (filtro, ordenação)
- **Migrações:** nomear com zero-padding + descrição descritiva (`0009_email_triage_notifications.sql`)
- **Updates:** nunca usar `Record<string, unknown>` — usar interfaces tipadas por tabela
- **Executor:** repositórios aceitam `DbExecutor` (satisfeito por `db` ou `tx`) para composição transacional

---

## Schema Contract

```bash
npm run test:db
```

Valida tables, columns, enums, indexes, extensions e alinhamento de migrations contra PostgreSQL ao vivo. Deve passar antes de qualquer deploy.

---

## Relacionamentos Principais

```
admins 1──N activities (assignee, created_by)
admins 1──N audit_logs (performed_by)
admins 1──N notifications (actor)
admins 1──N oficios (created_by, cancelled_by, updated_by)
admins 1──N operator_mcp_tokens

associates 1──N activities
associates 1──N monthly_payments
associates 1──N legal_consultations
associates 1──N documents
associates 1──N dependents (onDelete CASCADE)
associates 1──N health_agreements (onDelete CASCADE)

assignments 1──N associates (lotação)

legal_consultations 1──N legal_notes
legal_processes 1──N legal_notes

domain_events 1──N webhook_deliveries
webhook_subscriptions 1──N webhook_deliveries
```

---

## Documentação Relacionada

- `ARCHITECTURE.md` — visão geral da arquitetura
- `README.md` — setup e comandos
- `docs/adr/006-lgpd-manual-retention-review.md` — política de retenção LGPD
- `docs/runbook.md` — procedimentos operacionais (backup, restore, rollback)
- `src/lib/crypto/` — implementação da criptografia PII
