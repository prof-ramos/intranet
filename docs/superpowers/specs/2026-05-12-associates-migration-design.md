# Associates Migration Design

## Overview

Migrate 1,750 associate records from the legacy PHP system (`asof_associados.json`) into the ASOF Intranet PostgreSQL database, expanding the schema to accommodate all 39 fields from the source data plus new reference tables.

## Source Data

- **File**: `data/raw/asof_associados.json` (local operator copies the legacy export here before running the migration; do not hard-code a user-specific absolute path)
- **Records**: 1,750 (all Oficiais de Chancelaria; 440 are ASOF members)
- **Origin**: Legacy PHP system at `chancelaria.org.br`
- **Key fields**: 39 per record including personal data, functional data, assignment data, and dependent lists

## Key Decisions

1. **All 1,750 records imported** — not just ASOF members
2. **Association status is boolean**: `associado=true` → `ativo`; everything else → `inativo`
3. **Schema expanded** with new columns for all 39 source fields
4. **Dependents** → separate `dependents` table (N:1)
5. **Assignments** → separate `assignments` reference table (Brasil SERE units + exterior diplomatic posts)
6. **classPattern** kept as text — follows Lei 8.829 (Classes A, B, C, Especial with padrões I-VIII)
7. **Sensitive data included** (CPF, RG, address) — LGPD-compliant system

## Schema Changes

### New columns on `associates`

| Source field | Column | Type | Notes |
|---|---|---|---|
| `sexo` | `sex` | `text` | M/F |
| `naturalidade` | `birthplace_city` | `text` | |
| `uf_naturalidade` | `birthplace_state` | `text` | |
| `estado_civil` | `marital_status` | `text` | |
| `numero_dependentes` | `dependent_count` | `integer` | |
| `rg` | `rg` | `text` | |
| `uf_rg` | `rg_state` | `text` | |
| `orgao_expedidor` | `rg_issuer` | `text` | |
| `data_expedicao` | `rg_issue_date` | `date` | |
| `celular` | `whatsapp` | `text` | populated from `celular`; existing `phone` from `telefone` |
| `uf_endereco` | `location_state` | `text` | state/province of address |
| `bairro` | `neighborhood` | `text` | |
| `cep` | `postal_code` | `text` | |
| `data_admissao` | `admission_date` | `date` | civil service admission |
| `data_posse` | `inauguration_date` | `date` | inauguration into role |
| `origem` | `origin` | `text` | BRASIL, EXTERIOR, OUTROS ORGAOS |
| `missao` | `mission_type` | `text` | PERMANENTE or TRANSITORIA |
| `caoc` | `has_caoc` | `boolean` | Curso de Atualizacao (Lei 8.829) |
| `ceoc` | `has_ceoc` | `boolean` | Curso de Especializacao (Lei 8.829) |
| `data_cancelamento` | `canceled_at` | `timestamptz` | when membership was canceled |
| `convenios` | `agreements` | `jsonb` | varied data, stored as JSON |
| `licenca` | `on_leave` | `boolean` | on leave status |
| `data_licenca` | `leave_start_date` | `date` | |
| `lotacao` | `assignment` | `text` | legacy display/fallback value from source |
| parsed assignment | `assignment_id` | `bigint` | nullable FK to `assignments.id`; canonical relationship when a source lotacao maps to a known assignment |

### New table: `dependents`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | generated always as identity |
| `associate_id` | `bigint` FK → associates | with ON DELETE CASCADE |
| `name` | `text` | full name from JSON |
| `relationship` | `text` | parsed from parentheses: FILHO(A), ESPOSA, etc. |
| `created_at` | `timestamp` | default now() |

### New table: `assignments`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | generated always as identity |
| `name` | `text` | unique, e.g. "ABC - Agencia Brasileira de Cooperacao" |
| `abbreviation` | `text` | e.g. "ABC", "CGAO" |
| `location_type` | `text` | `brasil` or `exterior` |
| `post_type` | `text` | Exterior: embaixada, consulado_geral, delegacao, consulado, vice_consulado, escritorio_financeiro, escritorio_representacao, escritorio_comercial. Brasil: gabinete, secretaria, departamento, divisao, coordenacao_geral, assessoria, consultoria, agencia, comissao, instituto, coordenacao, secao, setor, nucleo, central, biblioteca, centro, fundacao, outro |
| `post_group` | `text` | A, B, C, D for exterior (Lei 11.440), null for brasil |
| `city` | `text` | |
| `country` | `text` | null for brasil |
| `address` | `text` | physical address |
| `emails` | `text` | |
| `phones` | `text` | |
| `is_active` | `boolean` | default true |
| `created_at` | `timestamp` | default now() |

### Assignment relationship

- `associates.assignment` remains as the raw human-readable legacy value for display fallback and auditability.
- `associates.assignment_id` is the canonical nullable FK to `assignments.id` when the importer can resolve the source `lotacao`.
- The FK should use `ON DELETE SET NULL` so historical associates remain readable if a reference assignment is retired or consolidated.
- Queries that need structured location/post metadata should join through `assignment_id`; free-text search may still include `assignment`.

### Mapping rules

**associationStatus:**
- `associado=true` → `'ativo'`
- `associado=false` or null → `'inativo'`

**functionalStatus:**
- `lotacao` starts with "INATIVO" or "APOSENTADO" → `'aposentado'`
- `licenca` is truthy → `'em_licenca'`
- Otherwise → `'ativo'`

**classPattern:**
- Kept as-is from source: "CLASSE A - I", "CLASSE C - V", "CLASSE ESPECIAL - III", etc.
- Validated against Lei 8.829 classes (A, B, C, Especial) and padroes

**Date parsing:**
- Source format: `d/M/yyyy` (e.g. "8/10/1946", "12/11/1992")
- Parsed to ISO dates for PostgreSQL

**CPF normalization:**
- Strip all non-digit characters
- Store as plain digits (11 chars)

**Dependents:**
- Source format: `"HENRI ADAM DIKOUS DE OLIVEIRA (FILHO(A))"`
- `name`: everything before the parentheses, trimmed
- `relationship`: content inside parentheses, trimmed

**Assignments:**
- 302 unique values from JSON parsed into `assignments` table
- SERE units (207) from separate CSV data
- Exterior posts (200+) from diplomatic posts list
- Merged and deduplicated (some lotacao values like "APOSENTADO - SERVIDOR APOSENTADO" are not real assignments — mapped as functionalStatus instead)

## Migration Script

### File: `scripts/seed-associates.ts`

1. Read `data/raw/asof_associados.json` or an explicit `ASSOCIATES_SOURCE_JSON` path supplied by the operator
2. Run schema migration first (drizzle-kit generate + migrate)
3. Seed `assignments` from the 302 unique `lotacao` values + SERE units + diplomatic posts
4. Seed `associates` with all 1,750 records, mapping fields per rules above
5. Seed `dependents` from the `dependentes` arrays
6. Use `ON CONFLICT DO UPDATE` for idempotent re-runs
7. Run via: `DATABASE_MIGRATION_URL=<supabase-direct> npx tsx scripts/seed-associates.ts`

### Migration files

A new drizzle migration will add:
- New columns on `associates`
- `dependents` table
- `assignments` table
- Nullable `associates.assignment_id` FK to `assignments.id`
- Updated indexes

## Verification

After migration:
1. Count: 1,750 associates, ~628 dependent records, ~500+ assignments
2. Unique constraints: CPF, SIAPE, primary_email
3. Spot-check 5 random records against source JSON
4. Verify associationStatus distribution: ~440 ativo, ~1310 inativo
5. Verify no data loss on sensitive fields (CPF count matches source)
6. Verify `canceled_at` is `timestamp with time zone`
7. Verify `assignment_id` FK exists, is nullable, and resolves for mapped assignments while preserving raw `assignment`
