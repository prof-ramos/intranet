# Database — ASOF Intranet

> Schema reference e guia operacional do banco de dados.
> Última atualização: 2026-06-15 (migração 0020: expansão de associates, dependents, health_agreements)

---

## Stack

- **Provider:** Neon Postgres (serverless)
- **ORM:** Drizzle ORM (`drizzle-orm` + `postgres-js`)
- **Migrações:** Drizzle Kit (`drizzle-kit`), SQL versionado em `drizzle/postgres/`
- **Schema:** `src/lib/db/schema/` (um arquivo por domínio)

---

## Conexão

| Ambiente | Variável | Descrição |
|----------|----------|-----------|
| Runtime | `DATABASE_URL` | Pooled (Neon pooler) — `ep-empty-cake-ac26vl6w-pooler.sa-east-1.aws.neon.tech` |
| Migrations | `DATABASE_MIGRATION_URL` | Direta (Neon direct) — `ep-empty-cake-ac26vl6w.sa-east-1.aws.neon.tech` |

O cliente Drizzle (`src/lib/db/index.ts`) também aceita fallbacks legados: `DATABASE_POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`.

### Desenvolvimento local

- **Recomendado (dados reais):** Clone do Neon em `asof_intranet_neon_clone` (veja README.md > Banco de dados e CONTRIBUTING.md para o procedimento completo de dump/restore usando cliente PostgreSQL 17).
  - **Aviso LGPD (crítico):** O clone contém PII sensível (CPF, SIAPE, endereços, etc.). Siga controles estritos do README (delete dumps de /tmp imediatamente, use apenas em máquinas autorizadas com FDE, nunca compartilhe ou persista sem proteção). Prefira setup mínimo. Consulte `src/lib/lgpd/`, `sanitizePii()`, `lib/crypto/pii.ts` e ADRs (ex. 006).
- **Mínimo:** Banco vazio `asof_intranet` + `npm run db:seed`.
- Sempre use URLs locais (sem sslmode=require) e usuário do sistema (ex: `postgres://gabrielramos@localhost:5432/asof_intranet_neon_clone`).
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

### Índices CONCURRENTLY

`CREATE INDEX CONCURRENTLY` e `DROP INDEX CONCURRENTLY` **não** podem ser executados dentro de transações PostgreSQL. Como o Drizzle Kit (`npm run db:migrate`) aplica migrações envolvendo cada statement em uma transação, esses comandos falham nesse fluxo. Para esses casos: backup → teste em staging → execução direta via `psql "$DATABASE_MIGRATION_URL"` → validação com `npm run test:db`.

### Migrações aplicadas (21)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 0000 | `0000_green_glorian.sql` | Baseline inicial |
| 0001 | `0001_living_hobgoblin.sql` | Ajustes pós-baseline |
| 0002 | `0002_fix_assignment_type_enum_labels.sql` | Correção de labels enum assignment_type |
| 0003 | `0003_same_shen.sql` | Ajustes diversos |
| 0004 | `0004_add_integration_api_key_signing_secret.sql` | Segredo HMAC por chave de API |
| 0005 | `0005_add_assinafy_oficios.sql` | Integração Assinafy |
| 0006 | `0006_add_lgpd_request_notification_type.sql` | Tipo de notificação LGPD |
| 0007 | `0007_email_triage_mvp.sql` | Módulo de triagem de email |
| 0008 | `0008_mute_the_twelve.sql` | Ajustes diversos |
| 0009 | `0009_email_triage_notifications.sql` | Notificações de triagem de email |
| 0010 | `0010_relax_email_triage_operational_review.sql` | Relaxa validações operacionais de triagem |
| 0011 | `0011_lawyers_name_trgm.sql` | Índice GIN trigram em lawyers.name |
| 0012 | `0012_password_reset_tokens.sql` | Tabela password_reset_tokens |
| 0013 | `0013_admin_session_version.sql` | Coluna session_version em admins |
| 0014 | `0014_rename_oficios_unique_constraint.sql` | Renomeia constraint unique de oficios |
| 0015 | `0015_greedy_robin_chapel.sql` | lawyer_id e thread_id em legal_consultations |
| 0016 | `0016_add_assinafy_signing_url.sql` | Coluna assinafy_signing_url em oficios |
| 0017 | `0017_expand_domain_events_and_assinafy.sql` | Expande domain_event_type; assinafy partially_signed |
| 0018 | `0018_add_oficio_notification_types.sql` | Tipos de notificação oficio |
| 0019 | `0019_add_recipient_address_fields.sql` | Campos de endereço do destinatário em oficios |
| 0020 | `0020_careless_penance.sql` | Expansão de associates (21 colunas, 4 enums, 2 tabelas) |

### Nomenclatura

Migrations seguem o padrão `NNNN_descricao.sql` com zero-padding de 4 dígitos. O arquivo `drizzle/postgres/meta/_journal.json` mantém o registro de quais migrações foram aplicadas.

---

## Schema (`src/lib/db/schema/`)

### Tabelas (27)

#### Core

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `admins` | `admins.ts` | Usuários administrativos (login, roles, password_hash) |
| `associates` | `associates.ts` | Cadastro de associados (dados pessoais, PII, situação, dados funcionais) |
| `assignments` | `assignments.ts` | Lotações/postos (domestic/abroad) |

#### Atividades

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `activities` | `activities.ts` | Quadro kanban de atividades administrativas |

#### Financeiro

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `monthly_payments` | `finance.ts` | Registros mensais de pagamento de mensalidades |

#### Associados (relacionamentos)

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `dependents` | `dependents.ts` | Dependentes de associados (nome, parentesco) |
| `health_agreements` | `health-agreements.ts` | Convênios médicos por associado |

#### Jurídico

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `legal_consultations` | `legal-consultations.ts` | Consultas jurídicas (SLA, status) |
| `legal_notes` | `legal-notes.ts` | Notas/interações em consultas e processos |
| `legal_processes` | `legal-processes.ts` | Processos jurídicos |
| `legal_opinions` | `legal-opinions.ts` | Pareceres jurídicos |
| `legal_opinion_tags` | `legal-opinions.ts` | Tags de pareceres |
| `lawyers` | `lawyers.ts` | Escritórios/advogados cadastrados |

#### Secretaria

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `oficios` | `oficios.ts` | Ofícios (documentos oficiais, PDF) |
| `documents` | `documents.ts` | Documentos institucionais (uploads) |

#### Email Triage

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `email_triagens` | `email-triage.ts` | Triagem automática de emails (Gemini AI) |

#### Notificações

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `notifications` | `notifications.ts` | Notificações persistidas (polling) |

#### Auditoria

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `audit_logs` | `audit.ts` | Eventos de auditoria (LGPD, compliance) |

#### Integrações

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `domain_events` | `integrations.ts` | Outbox de eventos de domínio |
| `webhook_subscriptions` | `integrations.ts` | Subscriptions de webhooks outbound |
| `webhook_deliveries` | `integrations.ts` | Histórico de entregas de webhook |
| `integration_api_keys` | `integrations.ts` | Chaves de API M2M com escopos |

#### Segurança

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `login_attempts` | `login-attempts.ts` | Tentativas de login (rate limit) |
| `rate_limits` | `rate-limits.ts` | Rate limiting PostgreSQL-backed |

#### Configuração

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `app_settings` | `app-settings.ts` | Configurações globais da aplicação |

#### Métricas

| Tabela | Arquivo | Finalidade |
|--------|---------|------------|
| `test_results` | `test-metrics.ts` | Resultados de testes |
| `test_runs` | `test-metrics.ts` | Execuções de teste |

### Views

| View | Arquivo | Finalidade |
|------|---------|------------|
| `vw_associates_dashboard` | `views.ts` | Agregações para o dashboard |

---

## Enums (39)

### Associados

| Enum | Valores | Uso |
|------|---------|-----|
| `association_status` | `ativo`, `inativo` | Situação associativa |
| `functional_status` | `ativo`, `aposentado`, `cedido`, `em_licenca` | Situação funcional |
| `contribution_status` | `em_dia`, `inadimplente`, `pendente_migracao` | Contribuição |
| `assignment_type` | `nacional`, `exterior` | Tipo de lotação |
| `sex` | `M`, `F` | Sexo biológico |
| `marital_status` | `solteiro`, `casado`, `divorciado`, `viuvo`, `separado`, `outros` | Estado civil |
| `mission_type` | `permanente`, `transitoria` | Tipo de missão |
| `career_origin` | `brasil`, `exterior`, `outros_orgaos` | Origem de carreira |

### Financeiro

| Enum | Valores | Uso |
|------|---------|-----|
| `payment_method` | `folha`, `boleto`, `pix`, `transferencia`, `outros` | Método de pagamento |
| `payment_status` | `pago`, `pendente`, `atrasado`, `isento`, `cancelado` | Status da mensalidade |

### Atividades

| Enum | Valores | Uso |
|------|---------|-----|
| `activity_status` | `a_fazer`, `em_andamento`, `aguardando_terceiros`, `concluido` | Status do card kanban |
| `activity_priority` | `baixa`, `normal`, `alta`, `urgente` | Prioridade |

### Administração

| Enum | Valores | Uso |
|------|---------|-----|
| `admin_role` | `admin`, `diretoria`, `secretaria` | Role de usuário |

### Jurídico

| Enum | Valores | Uso |
|------|---------|-----|
| `legal_consultation_status` | `aberta`, `aguardando_escritorio`, `respondida`, `arquivada` | Status da consulta |
| `legal_process_status` | `ativo`, `concluido`, `suspenso` | Status do processo |
| `legal_process_type` | `judicial`, `administrativo` | Tipo de processo |
| `legal_process_subtype` | `justica_federal`, `stf`, `mre`, `cgu`, `tcu` | Subtipo |
| `legal_note_entity_type` | `consultation`, `process` | Entidade da nota |
| `legal_satisfaction` | `satisfeito`, `insatisfeito`, `sem_resposta` | Satisfação |
| `lawyer_status` | `ativo`, `inativo` | Status do escritório |

### Ofícios

| Enum | Valores | Uso |
|------|---------|-----|
| `official_letter_status` | `gerado`, `cancelado`, `rascunho` | Status do ofício |
| `assinafy_document_status` | `uploading`, `uploaded`, `metadata_processing`, `metadata_ready`, `pending_signature`, `certificating`, `certificated`, `expired`, `rejected_by_signer`, `rejected_by_user`, `failed` (11) | Status Assinafy |

### Documentos

| Enum | Valores | Uso |
|------|---------|-----|
| `document_category` | `modelo_contrato`, `contrato`, `minuta`, `estatuto`, `ata`, `oficio`, `rh`, `evento`, `nota_fiscal`, `comprovante`, `outro` | Categoria |

### Email Triage

| Enum | Valores | Uso |
|------|---------|-----|
| `email_status_triagem` | `novo`, `analisado`, `aguardando_validacao`, `validado`, `em_andamento`, `concluido`, `vencido`, `arquivado`, `erro_validacao_ia`, `erro_processamento_anexo`, `aguardando_reprocessamento`, `descartado_por_irrelevancia`, `pendente_validacao_lgpd` (13) | Status da triagem |
| `email_categoria` | `juridico`, `administrativo`, `financeiro`, `institucional`, `comunicacao`, `irrelevante` | Classificação Gemini |
| `email_confianca` | `baixa`, `media`, `alta` | Confiança da classificação |
| `email_nivel_risco` | `baixo`, `medio`, `alto`, `critico` | Risco identificado |
| `email_responsavel` | `juridico`, `administrativo`, `financeiro`, `diretoria` | Área responsável |
| `email_tipo_prazo` | `processual`, `administrativo`, `contratual`, `financeiro`, `reuniao`, `resposta`, `outro` | Classificação de urgência |

### Notificações

| Enum | Valores | Uso |
|------|---------|-----|
| `notification_type` | `activity.completed`, `legal_consultation.answered`, `activity.assigned`, `legal_consultation.sla_warning`, `lgpd_request`, `email_triage_pending` | Categoria |
| `notification_entity_type` | `activity`, `legal_consultation`, `email_triagem` | Entidade relacionada |

### Auditoria

| Enum | Valores | Uso |
|------|---------|-----|
| `audit_entity_type` | `associate`, `admin`, `activity`, `assignment`, `legal_consultation`, `legal_process`, `finance`, `monthly_payment`, `official_letter`, `domain_event`, `webhook_subscription`, `document` (12) | Tipo de entidade auditada |

### Integrações

| Enum | Valores | Uso |
|------|---------|-----|
| `domain_event_type` | `associate.updated`, `legal_consultation.created`, `legal_consultation.status_changed`, `official_letter.created`, `monthly_payment.updated`, `official_letter.published` | Categoria do evento |
| `domain_event_entity_type` | `associate`, `legal_consultation`, `official_letter`, `monthly_payment` | Entidade relacionada |
| `domain_event_delivery_status` | `pending`, `processing`, `delivered`, `partially_delivered`, `failed` | Status de entrega |
| `webhook_delivery_status` | `pending`, `delivered`, `failed`, `retry_scheduled` | Status do delivery |

### Métricas

| Enum | Valores | Uso |
|------|---------|-----|
| `test_environment` | `ci`, `local` | Ambiente de execução |
| `test_result_status` | `passed`, `failed`, `skipped`, `todo`, `timed_out`, `interrupted`, `unknown` | Status do teste |
| `test_runner` | `vitest`, `playwright` | Runner |

---

## Índices

### Convenção

- **Prefixo:** `idx_` para índices customizados
- **Parciais:** para `WHERE` condicionais (ex: `WHERE status != 'concluido'`)
- **GIN trigram:** para `LIKE '%term%'` em campos de texto (`idx_*_name_trgm`)
- **Compostos:** para queries comuns de `(filter, order)` (ex: `idx_activities_status_due_date`)

### Destaques

| Tabela | Índice | Tipo | Finalidade |
|--------|--------|------|------------|
| `associates` | `idx_associates_name_trgm` | GIN | Busca textual por nome |
| `associates` | `idx_associates_cpf` | UNIQUE | CPF único |
| `associates` | `idx_associates_siape` | UNIQUE | SIAPE único |
| `associates` | `idx_associates_primary_email` | UNIQUE | Email único |
| `associates` | `idx_associates_status_name` | Composto | Listagem por status + nome |
| `associates` | `idx_associates_rg_hash` | B-tree | Lookups por RG (blind index) |
| `monthly_payments` | `idx_monthly_payments_unique` | UNIQUE | Um pagamento por (associate, year, month) |
| `activities` | `idx_activities_status_due_date` | Composto | Kanban por status + data |
| `documents` | `idx_documents_name_trgm` | GIN | Busca textual por nome |
| `documents` | `idx_documents_description_trgm` | GIN | Busca textual por descrição |
| `lawyers` | `idx_lawyers_name_trgm` | GIN | Busca textual por nome |
| `dependents` | `idx_dependents_associate_id` | B-tree | FK lookup por associado |
| `health_agreements` | `idx_health_agreements_associate_id` | B-tree | FK lookup por associado |

---

## PII e Criptografia

### Campos protegidos (LGPD)

`cpf`, `siape`, `email`, `phone`, `whatsapp`, `address`, `birthDate`, `rg`, `internalNotes`

### Helpers (`src/lib/crypto/`)

| Função | Finalidade |
|--------|------------|
| `encryptPii()` | AES-256-GCM com HKDF para armazenamento |
| `piiBlindIndex()` | HMAC blind index para busca |
| `sanitizePii()` | Redação de PII em logs |

### Regras

- Plaintext nunca em logs, erros ou respostas de API
- Dados legados/importados em plaintext são risco operacional aceito, controlados via acesso ao Neon + auditoria
- Usuários autenticados da intranet têm visibilidade operacional integral de PII
- Campos RG seguem padrão triple-column: `rg` (plaintext, nullable) + `rgCiphertext` + `rgHash` com CHECK constraint (`rg IS NULL OR rgCiphertext IS NULL`)

### Colunas PII com triple-column pattern

| Campo plaintext | Ciphertext | Blind index (hash) | CHECK constraint |
|-----------------|-----------|---------------------|-------------------|
| `cpf` | `cpfCiphertext` | `cpfHash` | `cpf IS NULL OR cpfCiphertext IS NULL` |
| `siape` | `siapeCiphertext` | `siapeHash` | `siape IS NULL OR siapeCiphertext IS NULL` |
| `email` | `emailCiphertext` | `emailHash` | `emailHash` (unique, não-null se email existe) |
| `rg` | `rgCiphertext` | `rgHash` | `rg IS NULL OR rgCiphertext IS NULL` |

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
