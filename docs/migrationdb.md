# Database Quality Improvements — Migration Plan

> Date: 2026-05-12
> Scope: Schema quality, query performance, connection management, concurrency, monitoring
> Base: Supabase Postgres Best Practices (8 categories)

---

## Context

Análise completa do schema PostgreSQL da intranet ASOF contra as 8 categorias do guia Supabase Postgres Best Practices. 12 tabelas, 14 enums, ~763 associados.

---

## Summary by Category

| Category | Score | Key Issues |
|---|---|---|
| 1. Query Performance | 7/10 | Missing trigram index on `legal_consultations.title`; redundant indexes; missing composite `(status, created_at)` |
| 2. Connection Management | 8/10 | Pool size 5→10; missing `max_lifetime`, `statement_timeout`, `application_name` |
| 3. Security & RLS | 7/10 | RLS removed in migration 0001; `requireAuth` hits DB every request |
| 4. Schema Design | 6/10 | `legal_processes.satisfaction` text (not enum); `legal_notes.entity_type` free text; `associates.assignment` no FK |
| 5. Concurrency & Locking | 5/10 | `createConsultationService` não usa transação; `updateAssociateById` usa `Record<string, unknown>` sem sanitização |
| 6. Data Access Patterns | 6/10 | N+1 potencial em `findLinkedActivities` |
| 7. Monitoring & Diagnostics | 3/10 | Sem `pg_stat_statements`; sem slow query logging |
| 8. Advanced Features | 5/10 | `pg_trgm` instalado; sem tsvector, sem mat views |

---

## Problemas por Prioridade

### 🔴 CRÍTICO

| # | Problema | Arquivo | Correção |
|---|---|---|---|
| 1 | RLS removido — sem defense-in-depth | Migração 0001 | Reimplementar RLS policies em 10 tabelas |
| 2 | Pool config insuficiente | `src/lib/db/index.ts` | `max: 10`, +`max_lifetime`, +`statement_timeout`, +`application_name` |

### 🔴 ALTO

| # | Problema | Arquivo | Correção |
|---|---|---|---|
| 3 | `legal_processes.satisfaction` text | `legal-processes.ts:31` | Mudar para `legalSatisfaction` enum |
| 4 | `legal_notes.entity_type` text sem restrição | `legal-notes.ts:8` | Criar `legal_note_entity_type` enum |
| 5 | Sem trigram em `legal_consultations.title` | Nova migration | `CREATE INDEX ... gin (title gin_trgm_ops)` |
| 6 | `createConsultationService` sem transação | `service.ts:83-92` | Unificar em `db.transaction()` |
| 7 | `updateAssociateById` sem tipagem | `repository.ts:97-101` | Tipagem explícita |

### 🟡 MÉDIO

| # | Problema | Arquivo | Correção |
|---|---|---|---|
| 8 | Sem composite `(status, created_at DESC)` | Nova migration | Novo índice |
| 9 | Índices redundantes | Nova migration | `DROP idx_activities_due_date`, `DROP idx_legal_consultations_last_interaction` |
| 10 | N+1: `findLinkedActivities` | `repository.ts:60-71` | Aceito (volume < 1000) |
| 11 | `activities.position` como `real` | `activities.ts:34` | Aceito (não há reordenação frequente) |
| 12 | Sem `pg_stat_statements` | Nova migration | `CREATE EXTENSION pg_stat_statements` |

---

## Plano de Execução (6 Etapas)

### Etapa 0 — Documentação

| Arquivo | Ação |
|---|---|
| `docs/migrationdb.md` | Este documento |
| `ARCHITECTURE.md` | Nova seção "Database Architecture Decisions" |
| `AGENTS.md` | Nova seção "Database Conventions" |
| `docs/adr/ADR-001-rls-removal-and-reimplementation.md` | ADR formal |

### Etapa 1 — Connection Management

**Arquivo:** `src/lib/db/index.ts`

```typescript
const client = postgres(databaseUrl, {
  prepare: !usesTransactionPooler,
  max: positiveInteger(env.DB_MAX_CONNECTIONS, 10),
  max_lifetime: 60 * 30,
  connect_timeout: positiveInteger(env.DB_CONNECT_TIMEOUT_SECONDS, 10),
  idle_timeout: positiveInteger(env.DB_IDLE_TIMEOUT_SECONDS, 20),
  ssl: ...,
  connection: {
    application_name: 'asof-intranet',
    statement_timeout: 30000,
  },
});
```

### Etapa 2 — Schema Enums

**2.1** `src/lib/db/schema/legal-processes.ts`
- `satisfaction`: `text(...)` → `legalSatisfaction('satisfaction')`
- Importar `legalSatisfaction` de `legal-consultations.ts`

**2.2** `src/lib/db/schema/legal-notes.ts`
- Criar `pgEnum('legal_note_entity_type', ['consultation', 'process'])`
- `entityType`: `text(...)` → `legalNoteEntityType('entity_type')`

### Etapa 3 — Concurrency

**3.1** `src/lib/juridico/service.ts`
- `generateInternalNumber` aceitar `executor: Tx = db`
- `createConsultationService` rodar geração + insert dentro de `db.transaction()`

**3.2** `src/lib/associates/repository.ts`
- Remover `Record<string, unknown>` no `set` de `updateAssociateById`

### Etapa 4 — Migration `0009_quality_improvements.sql`

```sql
-- pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Novos índices
CREATE INDEX idx_legal_consultations_title_trgm
  ON legal_consultations USING gin (title gin_trgm_ops);
CREATE INDEX idx_legal_consultations_status_created_at
  ON legal_consultations (status, created_at DESC);

-- Remover redundantes
DROP INDEX IF EXISTS idx_activities_due_date;
DROP INDEX IF EXISTS idx_legal_consultations_last_interaction;

-- Enums
ALTER TABLE legal_processes
  ALTER COLUMN satisfaction TYPE legal_satisfaction
  USING satisfaction::legal_satisfaction;
CREATE TYPE legal_note_entity_type AS ENUM ('consultation', 'process');
ALTER TABLE legal_notes
  ALTER COLUMN entity_type TYPE legal_note_entity_type
  USING entity_type::legal_note_entity_type;

-- RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE associates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all" ON admins FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "associates_all" ON associates FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "activities_all" ON activities FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_all" ON audit_logs FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_consultations_all" ON legal_consultations FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_processes_all" ON legal_processes FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_notes_all" ON legal_notes FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "legal_opinions_all" ON legal_opinions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "login_attempts_all" ON login_attempts FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "rate_limits_all" ON rate_limits FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
```

### Etapa 5 — Testes

**Arquivo:** `src/lib/db/schema.integration.test.ts`

| Seção | Mudança |
|---|---|
| `expectedEnums` | +`legal_note_entity_type: ['consultation', 'process']` |
| `expectedColumns.legal_processes` | `'satisfaction:text:YES'` → `'satisfaction:legal_satisfaction:YES'` |
| `expectedColumns.legal_notes` | `'entity_type:text:NO'` → `'entity_type:legal_note_entity_type:NO'` |
| `expectedIndexes.activities` | Remover `'idx_activities_due_date'` |
| `expectedIndexes.legal_consultations` | +`'idx_legal_consultations_title_trgm'`, +`'idx_legal_consultations_status_created_at'`, -`'idx_legal_consultations_last_interaction'` |

---

## Arquivos Afetados

| Arquivo | Tipo | Etapa |
|---|---|---|
| `docs/migrationdb.md` | Documento | 0 |
| `ARCHITECTURE.md` | Documento | 0 |
| `AGENTS.md` | Documento | 0 |
| `docs/adr/ADR-001-rls-removal-and-reimplementation.md` | Documento | 0 |
| `src/lib/db/index.ts` | Código | 1 |
| `src/lib/db/schema/legal-processes.ts` | Código | 2.1 |
| `src/lib/db/schema/legal-notes.ts` | Código | 2.2 |
| `src/lib/db/schema/legal-consultations.ts` | Código | 2 (export) |
| `src/lib/juridico/service.ts` | Código | 3.1 |
| `src/lib/associates/repository.ts` | Código | 3.2 |
| `drizzle/postgres/0009_quality_improvements.sql` | Migração | 4 |
| `drizzle/postgres/meta/_journal.json` | Migração | 4 |
| `src/lib/db/schema.integration.test.ts` | Teste | 5 |

---

## Referências

- https://supabase.com/docs/guides/database/query-optimization
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/postgres/enums
- https://supabase.com/docs/guides/database/extensions/pg_stat_statements
- https://supabase.com/docs/guides/database/inspect
- https://github.com/porsager/postgres
