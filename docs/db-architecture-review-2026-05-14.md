# Revisão de Arquitetura de Banco de Dados — ASOF Intranet
**Data:** 2026-05-14 | **Nota Geral: B+**

---

## 1. Resumo Executivo

A arquitetura de DB está bem acima da média para um sistema interno. Pontos fortes: enums PostgreSQL consistentes, indexes parciais e compostos, criptografia AES-256-GCM para webhook secrets, padrão outbox com validação Zod, testes de contrato de schema. Pontos fracos concentram-se em segurança (PII em texto plano, RLS permissivo) e consistência transacional no módulo de integrações.

**Top 3 Prioridades:**
1. **CRÍTICO** — CPF e SIAPE armazenados em texto plano (viola LGPD)
2. **CRÍTICO** — RLS permissivo em 16 tabelas + 2 tabelas sem RLS (`monthly_payments`, `oficios`)
3. **ALTO** — Auth de integrações ainda usa env vars como autoridade; `integration_api_keys` ainda não tem CRUD/rotação por chave

---

## 2. Achados por Categoria e Severidade

### CRÍTICO

| # | Achado | Arquivo | Descrição |
|---|--------|---------|-----------|
| C1 | CPF/SIAPE em texto plano | `schema/associates.ts:39,43` | `cpf` e `siape` são `text` sem criptografia. Viola LGPD Art. 5,I e Art. 46. Vazamento do banco expõe dados de ~763 associados. |
| C2 | RLS permissivo + 2 tabelas sem RLS | `0009_quality_improvements.sql`, `0015_add_integrations_and_webhooks.sql` | 16 de 18 tabelas têm RLS habilitado mas com `USING(true) WITH CHECK(true)`. `monthly_payments` e `oficios` **não têm RLS habilitado** — são ainda mais expostas. Qualquer conexão com `anon` key tem acesso total a todas as tabelas. |
| C3 | Eventos presos em `processing` | `webhooks/service.ts`, `webhooks/repository.ts` | **Mitigado no v1:** o batch recupera eventos antigos em `processing` e usa `FOR UPDATE SKIP LOCKED` para evitar double-processing entre workers concorrentes. Follow-up: expor métricas/alertas para eventos recuperados. |
| C4 | API Keys sem CRUD | `schema/integrations.ts` | Tabela `integration_api_keys` existe mas não há service/repository/actions para criar, listar, revogar ou rotacionar chaves. |
| C5 | Auth de integrações ainda não é table-backed | `integrations/auth.ts` | `authorizeIntegrationRequest` valida contra `config.apiKey` e `config.hmacSecret` (variáveis de ambiente), **não contra a tabela `integration_api_keys` como autoridade**. `lastUsedAt` é atualizado em best-effort quando há hash correspondente, mas ainda não há rotação per-key, revogação per-key ou escopos efetivos. |

### ALTO

| # | Achado | Arquivo | Descrição |
|---|--------|---------|-----------|
| A1 | Dispatch parcialmente transacional | `webhooks/service.ts:201-269` | O batch agora usa lock atômico para claim de eventos, mas a entrega individual ainda executa múltiplas operações DB fora de uma transação ampla. Inconsistência parcial ainda é possível se houver falha depois de algumas entregas. |
| A2 | Race condition no dispatch mitigada | `webhooks/service.ts`, `webhooks/repository.ts` | O batch usa `FOR UPDATE SKIP LOCKED` ao selecionar eventos pendentes. Follow-up: alinhar dispatch manual de evento específico à mesma política de claim/lock. |
| A3 | PII em `source_payload` | `schema/associates.ts:61` | Contém dados brutos de importação incluindo CPF, SIAPE, endereços completos. Sem tratamento ou criptografia. |
| A4 | Repositórios retornam PII sem filtro de role | `associates/repository.ts`, `finance/repository.ts:100` | `getAssociatesListPage` retorna `primaryEmail` sem mascaramento para `secretaria`. `finance/repository.ts` seleciona `siape` diretamente sem filtro de role. Ambos exigem autenticação, mas o acesso por `secretaria` expõe dados que deveriam ser restritos a `admin/diretoria`. Proteção está apenas no nível de rota, não no repository. |
| A6 | Indexes completos onde parciais seriam melhores | `schema/integrations.ts:70,100,164` | `webhook_subscriptions.is_active`, `domain_events.delivery_status`, `integration_api_keys.is_active` — indexes completos onde parciais seriam 80-90% menores. |
| A7 | `finance/initializeMonth` sem transação | `finance/service.ts` | `Promise.all` com múltiplos `upsertMonthlyPayment` sem `db.transaction`. Risco de inicialização parcial. |
| A8 | `audit_logs.changes` pode conter PII | `audit/service.ts` | Snapshots de CPF, SIAPE, email em texto plano no log de auditoria. Regex de sanitização existe mas pode não capturar todos os campos. |
| A9 | `domain_events.payload` pode conter PII | `integrations/outbox.ts` | **Risco arquitetural:** `sanitizePayloadValue` em `outbox.ts` é apenas serialização JSON (Date→ISO, BigInt→String, circular→"[circular]") — **não sanitiza PII**. A sanitização real acontece apenas no envio de webhooks (`webhooks/service.ts`). Os payloads atuais contêm IDs e status (não PII direto como CPF/SIAPE), mas nada impede que schemas futuros incluam PII. Dados armazenados no banco ficam em texto plano. |

### MÉDIO

| # | Achado | Arquivo | Descrição |
|---|--------|---------|-----------|
| M1 | `activities.position` usa `real` (float4) | `schema/activities.ts:41` | Aritmética com floats acumula erros. `integer` com lacunas (1000, 2000) seria mais apropriado. |
| M2 | Dispatch sequencial de webhooks | `webhooks/service.ts:229-258` | Loop itera sobre subscriptions sequencialmente. Usar `Promise.allSettled()` reduziria latência de O(N×timeout) para O(timeout). |
| M3 | `sql.raw()` em `juridico/service.ts:35` | `juridico/service.ts` | Interpola `regexPattern` derivado de `new Date().getFullYear()`. Seguro mas é code smell — deveria usar `sql` template parametrizado. |
| M4 | Sem CHECK constraints | `schema/finance.ts`, `schema/oficios.ts`, `schema/integrations.ts` | `month` sem `BETWEEN 1 AND 12`, `year` sem `BETWEEN 2000 AND 2100`, `sequence` sem `> 0`, `attempt` sem `> 0`. |
| M5 | Sem dead-letter queue | `schema/integrations.ts` | Eventos permanentemente falhados ficam em `failed` sem mecanismo de re-injeção ou notificação. |
| M6 | Regex PII agressiva | `webhooks/service.ts` | `\b\d{6,12}\b` redacta IDs internos, números de ofício, SIAPEs que o destinatário pode precisar. |
| M7 | Código duplicado `safeCompare` | `auth.ts`, `dispatch/route.ts` | Implementações idênticas de `safeCompare`. Deveria ser extraído para módulo compartilhado. |
| M8 | `login_attempts` armazena email em texto plano | `schema/login-attempts.ts` | Vazamento da tabela expõe e-mails. Recomendação: hash SHA-256 como chave de rate limit. |
| M9 | Sem rate limiting para API pública | `api/v1/events/route.ts`, `api/v1/events/dispatch/route.ts` | Endpoints `/api/v1/events` e `/api/v1/health` sem rate limiting dedicado (apenas timestamp tolerance de 5min no HMAC). `/api/v1/events/dispatch` (cron) requer apenas `CRON_SECRET` bearer token, sem rate limiting. |
| M10 | `lastUsedAt` ainda é best-effort | `schema/integrations.ts`, `integrations/auth.ts` | O campo é atualizado após autenticação válida quando há `key_hash` correspondente, mas a chave de integração ainda não é validada contra a tabela. |
| M11 | Validação anti-SSRF ainda é inicial | `webhooks/subscriptions.ts` | `targetUrl` já exige HTTPS público e rejeita localhost, hostnames locais/internos e faixas privadas/reservadas. Follow-up: considerar resolução DNS no momento do envio para reduzir risco de DNS rebinding. |

### BAIXO

| # | Achado | Arquivo | Descrição |
|---|--------|---------|-----------|
| B1 | `bigint` para contadores pequenos | `schema/login-attempts.ts:8`, `schema/rate-limits.ts:9` | `attempts` usa `bigint` para valores que nunca ultrapassam ~5. `integer` seria mais econômico. |
| B2 | Enum cross-file dependency | `schema/legal-processes.ts:6` | Importa `legalSatisfaction` de `legal-consultations.ts`. Mover para `enums.ts` dedicado. |
| B3 | `idle_timeout=20s` | `db/index.ts:45` | Supabase recomenda 30-60s. Impacto mínimo para ~763 usuários. |
| B4 | Index `idx_associates_name` redundante | `schema/associates.ts` | Coberto pelo GIN trigram `idx_associates_name_trgm` e composite `idx_associates_status_name`. |
| B5 | `legal_opinions.relatedProcessId` sem FK | `schema/legal-opinions.ts` | Coluna solta sem constraint de integridade referencial. |
| B6 | Sem index DESC para `oficios.createdAt` | `schema/oficios.ts` | Query sempre ordena DESC. Index apenas ASC. Impacto mínimo para ~centenas de registros. |
| B7 | `initializeMonth()` faz N inserts individuais | `finance/service.ts:141-143` | Deveria usar batch insert. 763 round-trips por inicialização de mês. |
| B8 | Todas as paginações usam OFFSET | `associates/repository.ts`, `juridico/repository.ts`, `activities/repository.ts` | Keyset/cursor pagination seria mais eficiente para datasets crescentes. |
| B9 | `findOfficialLetters` sem LIMIT | `oficios/repository.ts:5-16` | Retorna todos os ofícios do ano sem paginação. |
| B10 | Env vars DB como `optionalString` | `env.ts:23-28` | `DB_MAX_CONNECTIONS` etc. deveriam ser validados como números. Fallback silencioso em vez de erro explícito. |

### POSITIVO

| # | Achado | Arquivo | Descrição |
|---|--------|---------|-----------|
| P1 | Enums PostgreSQL consistentes | Todos os schemas | 21 enums para todos os campos de status/tipo. Zero strings soltas. |
| P2 | PKs como `bigint IDENTITY` | Todos os schemas | Future-proof, sem risk of overflow. |
| P3 | Timestamps `timestamptz` | Todos os schemas | Sem ambiguidade de timezone. |
| P4 | Schema contract test | `schema.integration.test.ts` | Valida colunas, tipos, enums, indexes, RLS e alinhamento de migrations. |
| P5 | Criptografia webhook secrets | `webhooks/secrets.ts` | AES-256-GCM com IV aleatório, auth tag, formato versionado. Padrão reutilizável. |
| P6 | API key hash (SHA-256) | `schema/integrations.ts` | Chaves nunca armazenadas em plaintext. |
| P7 | PII sanitization em webhooks | `webhooks/service.ts:18,73-86` | Regex de redação para CPF, SIAPE, email, etc. |
| P8 | Like injection protection | `db/like-pattern.ts` | Escape correto de `%`, `_`, `\` em todas as queries LIKE. |
| P9 | Outbox pattern com Zod validation | `integrations/outbox.ts` | Validação de payload com `.strict()` antes da inserção. Todos os call sites passam `tx`. |
| P10 | Connection pooling auto-detecção | `db/index.ts` | Detecta pgbouncer (porta 6543, hostname) e desativa `prepare`. |
| P11 | bcrypt para senhas + timing-safe comparison | `auth/` | Login rate-limited com dummy hash para proteção contra timing attacks. |
| P12 | LGPD masking no service layer | `associates/service.ts` | `canViewSensitiveFields(role)` e `toAssociateProfileDTO` mascaram PII por role. |
| P13 | Supabase pooler auto-detecção | `db/index.ts` | Detecta 5 métodos de pooler (USE_PGBOUNCER, DB_POOL_MODE, pgbouncer param, hostname, porta 6543). |
| P14 | Batch queries com Promise.all | `dashboard/queries.ts`, `juridico/queries.ts` | Queries independentes executadas em paralelo. |
| P15 | Statement timeout de 30s | `db/index.ts` | Protege contra queries descontroladas. |

---

## 3. Plano de Ação Priorizado

### Fase 1 — Quick Wins (1-2 semanas)

| # | Ação | Esforço | Migration? | Impacto |
|---|------|---------|------------|---------|
| Q1 | Restringir RLS em tabelas críticas e habilitar RLS nas 2 tabelas sem RLS | M | Sim | Substituir `USING(true)` por políticas baseadas em roles para: `associates`, `admins`, `login_attempts`, `rate_limits`, `audit_logs`, `integration_api_keys`, `webhook_subscriptions`. **Habilitar RLS from scratch** para `monthly_payments` e `oficios` (atualmente sem RLS). |
| Q2 | Hash de email em `login_attempts` | P | Sim | Reduz exposição de PII |
| Q3 | Adicionar `recoverStuckProcessingEvents()` no dispatch | P | Não | **Concluído no v1**; manter observabilidade como follow-up |
| Q4 | Usar `SELECT FOR UPDATE SKIP LOCKED` no dispatch | P | Não | **Concluído no batch v1**; alinhar dispatch manual específico como follow-up |
| Q5 | Extrair `safeCompare` para módulo compartilhado | P | Não | Elimina duplicação |
| Q6 | Atualizar `lastUsedAt` após autenticação de API key | P | Não | Rastreabilidade |
| Q7 | Generalizar módulo de criptografia (`crypto.ts`) | M | Não | Prepara para criptografia de PII |

### Fase 2 — Segurança e Consistência (2-4 semanas)

| # | Ação | Esforço | Migration? | Impacto |
|---|------|---------|------------|---------|
| S1 | Criptografar CPF e SIAPE em repouso (colunas `cpf_ciphertext`, `siape_ciphertext` + hash columns para busca). **Depende de Q7** (generalização do módulo crypto). Reutilizar padrão AES-256-GCM de `webhooks/secrets.ts`. | G | Sim | LGPD compliance |
| S2 | Implementar CRUD para `integration_api_keys` | M | Não | Feature completa |
| S3 | Conectar auth de integrações à tabela `integration_api_keys` | G | Não | Refatorar `authorizeIntegrationRequest` para consultar a tabela em vez de config env vars. Implementar validação de scopes. |
| S4 | Envolver `dispatchDomainEventById` em transação | M | Não | Consistência de dados |
| S5 | Envolver `initializeMonth` em transação | P | Não | Consistência de dados |
| S6 | Substituir `sql.raw()` em `juridico/service.ts` | P | Não | Segurança defensiva |
| S7 | Adicionar CHECK constraints (`month`, `year`, `sequence`, `attempt`) | P | Sim | Integridade de dados |
| S8 | Migrar `activities.position` de `real` para `integer` | P | Sim | Precisão |
| S9 | Sanitizar `audit_logs.changes` para remover PII | M | Não | LGPD compliance |
| S10 | Adicionar rate limiting para API pública | M | Não | Proteção contra abuso |
| S11 | Batch insert em `initializeMonth()` | M | Não | Reduz de 763 round-trips para 1 query por mês |
| S12 | Validar env vars DB como números | P | Não | Erro explícito em vez de fallback silencioso |
| S13 | Adicionar `idle_in_transaction_session_timeout` na config do postgres.js | P | Não | Proteção contra transações órfãs |

### Fase 3 — Robustez e Observabilidade (1-3 meses)

| # | Ação | Esforço | Migration? | Impacto |
|---|------|---------|------------|---------|
| R1 | Implementar RLS baseado em JWT claims | G | Sim | Segurança real no nível do banco |
| R2 | Implementar dead-letter queue e cleanup de eventos | M | Sim | Gerenciamento de falhas |
| R3 | Adicionar `Idempotency-Key` header em webhooks | M | Não | Desduplicação no destinatário |
| R4 | Parallelizar dispatch com `Promise.allSettled()` | P | Não | Performance |
| R5 | Converter indexes completos para parciais (is_active, delivery_status) | P | Sim | Redução de 80-90% no tamanho |
| R5.1 | Adicionar GIN trigram index para busca de nomes | P | Sim (requer extensão pg_trgm) | Otimiza LIKE '%term%' em associates |
| R5.2 | Adicionar composite index (associationStatus, contributionStatus) | P | Sim | Otimiza dashboard queries |
| R5.3 | Adicionar FK index em monthly_payments.associateId | P | Sim | Otimiza JOIN com associates |
| R6 | Criar VIEW sem PII para consultas de lista | M | Sim | Camada adicional de proteção |
| R6.1 | Implementar cursor-based pagination para jurídico e atividades | M | Não | Evita degradação em páginas profundas |
| R6.2 | Adicionar cache (unstable_cache) para associados e atividades | M | Não | Reduz queries repetidas ao DB |
| R6.3 | Consolidar rate-limit queries em upsert único | P | Não | Reduz 3-4 queries para 1-2 por login |
| R7 | Endurecer verificação de URL para webhooks com resolução DNS/allowlist de egress | M | Não | Segurança |
| R8 | Suavizar regex PII (`\b\d{6,12}\b`) | P | Não | Evitar redação de IDs internos |
| R9 | Implementar retenção automática de eventos antigos | M | Sim | Gerenciamento de dados |
| R10 | Adicionar log de acesso a dados pessoais | G | Sim | LGPD Art. 30/37 |

### Fase 4 — Longo Prazo (3-6 meses)

| # | Ação | Esforço | Migration? | Impacto |
|---|------|---------|------------|---------|
| L1 | Criptografia em repouso para todos os PII (email, telefone, endereço) | G | Sim | LGPD compliance total |
| L2 | Rotacao de chaves de criptografia com versionamento | G | Não | Segurança operacional |
| L3 | HSM/Vault para gestão de chaves | G | Não | Compliance avançado |
| L4 | Mover enums compartilhados para `enums.ts` | P | Não | Organização |
| L5 | Adicionar FK em `legal_opinions.relatedProcessId` | P | Sim | Integridade referencial |
| L6 | Remover indexes redundantes | P | Sim | Leve redução de escrita |

---

## 4. Migrations Necessárias

| # | Migration | Prioridade | Conteúdo |
|---|-----------|-----------|----------|
| 1 | `0017_rls_restrict_critical_tables.sql` | CRÍTICO | Substituir políticas `USING(true)` por políticas baseadas em roles para tabelas críticas. Habilitar RLS e criar políticas para `monthly_payments` e `oficios` (atualmente sem RLS). |
| 2 | `0018_hash_login_attempts_email.sql` | ALTO | Adicionar coluna `email_hash`, migrar dados, alterar service para buscar por hash |
| 3 | `0019_encrypt_pii_columns.sql` | ALTO | Adicionar `cpf_ciphertext`, `cpf_hash`, `siape_ciphertext`, `siape_hash`; migrar dados; tornar colunas originais NULL |
| 4 | `0020_add_check_constraints.sql` | MÉDIO | `month BETWEEN 1 AND 12`, `year BETWEEN 2000 AND 2100`, `sequence > 0`, `attempt > 0` |
| 5 | `0021_convert_indexes_to_partial.sql` | MÉDIO | Converter indexes em `is_active`, `delivery_status` para partial indexes |
| 6 | `0022_alter_activities_position_to_integer.sql` | MÉDIO | Migrar `position` de `real` para `integer` com arredondamento |
| 7 | `0023_add_webhook_url_validation.sql` | BAIXO | Adicionar constraint ou trigger para validar URLs de webhook |
| 8 | `0024_add_related_process_fk.sql` | BAIXO | Adicionar FK em `legal_opinions.related_process_id` para `legal_processes.id` |

---

## 5. Inventory Summary

### Tabelas (18)
`admins`, `associates`, `activities`, `audit_logs`, `assignments`, `login_attempts`, `rate_limits`, `legal_consultations`, `legal_processes`, `legal_notes`, `legal_opinion_tags`, `legal_opinions`, `monthly_payments`, `oficios`, `domain_events`, `webhook_subscriptions`, `webhook_deliveries`, `integration_api_keys`

### Enums (21)
`admin_role`, `association_status`, `contribution_status`, `functional_status`, `payment_method`, `activity_status`, `activity_priority`, `assignment_type`, `audit_entity_type`, `legal_consultation_status`, `legal_satisfaction`, `legal_process_type`, `legal_process_subtype`, `legal_process_status`, `legal_note_entity_type`, `payment_status`, `official_letter_status`, `domain_event_type`, `domain_event_entity_type`, `domain_event_delivery_status`, `webhook_delivery_status`

### Foreign Keys (20+)
Todas com onDelete apropriado (SET NULL para opcionais, RESTRICT para obrigatórias, NO ACTION para pagamentos). Exceção: `legal_opinions.relatedProcessId` sem FK.

### Indexes (50+)
Cobertura boa com btree, GIN trigram, partial e composite. Gaps identificados: partial indexes para booleanos/status, index DESC para oficios, index para exterior filter.
