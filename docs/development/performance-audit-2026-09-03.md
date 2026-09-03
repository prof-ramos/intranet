# Auditoria de desempenho — ASOF Intranet

**Data:** 2026-09-03  
**Escopo:** análise estática do código (queries, crypto, cache, bundles, pool DB) + medição de first-load JS via `@next/bundle-analyzer` (`ANALYZE=true`).  
**Fora de escopo desta rodada:** traces de Core Web Vitals em produção, `EXPLAIN ANALYZE` em Neon prod, load test sob carga real.

## Sumário executivo

A intranet já tem bases sólidas: pool Postgres configurado, `withCache`/`unstable_cache` no dashboard e jurídico, índices trigram em associados, `optimizePackageImports` e análise de bundle. Os maiores ganhos restantes estão em:

1. **Fan-out de queries** no dashboard frio (11 queries × pool de 10).
2. **Invalidação de cache ampla** (`dashboard`, `associates`) e cache de financeiro ineficaz.
3. **JS autenticado pesado** (Novu ~138 KiB gzip em toda `/app/*`; Tiptap ~126 KiB no formulário de ofício).
4. **Relatórios/PII** (descriptografia de todos os campos + rederivação HKDF por campo).
5. **Listas operacionais sem limite** (board de atividades filtrado; lista de ofícios com `select()` completo).

Prioridade sugerida de implementação: **P1 cache/queries → P1 bundle Novu → P1 reports/crypto → P1 atividades/ofícios → P2 limpeza**.

## Status de implementação (2026-09-03)

| Onda | Status | Notas                                                                                                                                                                                                   |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Feito  | Dashboard `getAssociateMetrics`/`getActivityMetrics`; board sempre com limit; lista de ofícios projetada; anti-join SQL + aggregates.total no financeiro                                                |
| B    | Feito  | Tags `dashboard:associates` / `dashboard:activities` / `legal:*` / `finance:Y:M`; `withCache` aceita tags dinâmicas; cache persistente de mensalidades                                                  |
| C    | Feito  | Cache HKDF por processo; decrypt PII só para colunas selecionadas no CSV; cron overdue em batches `FOR UPDATE SKIP LOCKED`; cache negativo de assets PDF; `Cache-Control: private, no-store` em CSV/PDF |
| D    | Feito  | Novu sob clique; Tiptap sob “Editar formatação”; `search-params.shared` client-safe; `WelcomeBanner`/`FinanceKPIs` sem `'use client'`                                                                   |
| E    | Feito  | Migration `0034_performance_query_indexes` + script CONCURRENTLY manual; keyset em auditoria; notas jurídicas limitadas (100)                                                                           |

---

## 1. Gargalos de desempenho

### P0 — fluxo administrativo (não é request HTTP diário)

| ID   | Achado                                                                                                                                                  | Evidência                                     | Impacto                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| G0.1 | Reconciliação de identidade em modo apply trava 7 tabelas (`SHARE ROW EXCLUSIVE`), carrega snapshot completo 2× e aplica merges componente a componente | `src/lib/associates/identity-reconciliation/` | Bloqueia DML de associados/atividades/financeiro/jurídico durante toda a transação |

**Recomendação:** projeções estreitas no snapshot; reparenting set-based; checagem de referências em um `UNION`/`EXISTS`; commit antes do snapshot pós-apply; planejar fora do lock e revalidar evidência sob lock.

### P1 — caminhos quentes de request

| ID   | Achado                                                                                                                                   | Evidência                                                    | Impacto                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| G1.1 | Dashboard frio dispara 11 queries em paralelo; pool app = 10 conexões                                                                    | `dashboard/view-model.ts` L77–101; `db/index.ts` L35–42      | Um request pode saturar o pool da instância; cold deploy / `revalidateTag('dashboard')` amplifica |
| G1.2 | Export CSV busca ~40 colunas e descriptografa 7 campos PII por linha **antes** de filtrar colunas selecionadas; default até 5 000 linhas | `reports/queries.ts`, `reports/service.ts`, `reports/csv.ts` | Até ~35 000 decrypts + pico de memória no serverless                                              |
| G1.3 | Board de atividades **remove `.limit()`** quando há `status` / `openOnly` / `dueLate`; ordena no SQL e de novo em JS                     | `activities/repository.ts` L123–129                          | Filas “abertas/atrasadas” crescem sem teto; links do dashboard usam esses filtros                 |
| G1.4 | `findOfficialLetters()` usa `select()` (corpo rico incluso) para até 100 linhas; UI lista ~9 campos                                      | `oficios/repository.ts` L14–30                               | Payload RSC potencialmente de megabytes                                                           |
| G1.5 | Cron de atraso financeiro faz um `UPDATE … RETURNING` de **todo** o backlog pendente numa única transação                                | `finance/repository.ts`, `finance/service.ts`                | Cron perdido → transação gigante, locks e memória                                                 |
| G1.6 | Auditoria: `COUNT(*)` exato + `OFFSET` profundo + `LIKE '%q%'` em `action` sem índice trigram                                            | `config/auditoria/page.tsx`, schema `audit`                  | Degrada linearmente com o volume append-only                                                      |
| G1.7 | Buscas `%term%` em jurídico e email-triage sem GIN trigram / compostos alinhados ao `ORDER BY`                                           | `juridico/repository.ts`, `email-triage/repository.ts`       | Seq scans à medida que as tabelas crescem                                                         |

### P2 — eficiência menor / dívida

| ID   | Achado                                                                                                       | Recomendação                                               |
| ---- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| G2.1 | Create de associado: até 3 `SELECT *` sequenciais de unicidade apesar de unique indexes + mapeamento `23505` | Confiar no constraint ou 1 query OR só com id/hash         |
| G2.2 | Init de mensalidades filtra anti-join em JS                                                                  | `WHERE monthly_payments.id IS NULL`                        |
| G2.3 | Lista financeira: count e aggregate com o mesmo `WHERE`                                                      | Usar `aggregates.total` e remover count                    |
| G2.4 | Updates de atividade emitem até 5 eventos outbox sequenciais                                                 | `emitDomainEventsBatch()`                                  |
| G2.5 | Notas jurídicas sem paginação                                                                                | Keyset + índice `(entity_type, entity_id, created_at, id)` |
| G2.6 | Retry de webhooks: O(subscrições × deliveries) em JS                                                         | Um `Map<subscriptionId, lastDelivery>`                     |
| G2.7 | Numeração jurídica anual via `LIKE` + `MAX`                                                                  | Sequência dedicada `UPSERT … RETURNING`                    |
| G2.8 | `idx_associates_paginated_list` só na migration, ausente do schema Drizzle                                   | Espelhar no schema ou documentar exceção                   |

---

## 2. Utilização de recursos

### 2.1 Pool e conexões Postgres

```35:44:src/lib/db/index.ts
const client = postgres(databaseUrl, {
  prepare: !usesTransactionPooler,
  max: env.DB_MAX_CONNECTIONS ?? 10,
  max_lifetime: 60 * 30,
  connect_timeout: env.DB_CONNECT_TIMEOUT_SECONDS ?? 10,
  idle_timeout: env.DB_IDLE_TIMEOUT_SECONDS ?? 20,
  connection: {
    application_name: 'asof-intranet',
    statement_timeout: 30000,
  },
```

| Recurso                        | Estado atual                                                  | Risco                           | Recomendação                                                                      |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `max: 10` por instância warm   | Adequado para poucos lambdas; multiplica com scale-out Vercel | Contenção Neon Free / pooler    | Após consolidar fan-out do dashboard, load-test com `DB_MAX_CONNECTIONS=3–5`      |
| Detecção de transaction pooler | Boa (`prepare: false` em 6543/pgbouncer)                      | —                               | Manter                                                                            |
| `statement_timeout: 30s`       | Protege queries runaway                                       | Relatórios longos podem abortar | Timeout dedicado / streaming para export                                          |
| Rate limit genérico            | Vários round-trips por request aceito                         | Overhead sob burst              | Padrão do limiter de integrações (upsert atômico); cron de purge de `rate_limits` |

### 2.2 Memória / CPU serverless

- Relatório CSV materializa rows → objetos mapeados → strings CSV → blob final (até 5 000 × ~40 campos).
- PDF de ofício: probes repetidos a fontes/logo ausentes (`public/fonts/carlito/*`, `public/logo.png` vs só `logo.svg`) sem cache negativo → I/O e self-fetch desnecessários.
- Migração legada (`scripts/migrate-legacy.ts`): N+1 + até 14 derivações de chave por registro.

### 2.3 Bundle client (first-load gzip, `ANALYZE=true`)

| Rota          | First-load JS | Específico da rota | Nota pós-hidratação                            |
| ------------- | ------------: | -----------------: | ---------------------------------------------- |
| Dashboard     |     141,6 KiB |            6,2 KiB | + Novu ~138 KiB                                |
| Associados    |     175,5 KiB |           40,1 KiB | + Novu                                         |
| Atividades    |     180,7 KiB |           45,3 KiB | `@hello-pangea/dnd` ~30,6 KiB (core do board)  |
| Mensalidades  |     189,3 KiB |           53,9 KiB | —                                              |
| Ofícios lista |     145,2 KiB |            9,8 KiB | —                                              |
| Ofícios novo  |     177,2 KiB |           41,8 KiB | + Tiptap ~126,5 KiB ≈ **~442 KiB** total fetch |

**Novu:** `NotificationInboxWrapper` usa `dynamic()`, mas monta imediatamente no layout autenticado → chunks baixados em toda `/app/*`.

**Leak de server code no client:** `OfficialsSearchBox` / finance search importam módulos que puxam Zod + enums Drizzle (~35 KiB gzip compartilhados). Separar constantes/URL builders client-safe.

**Candidatos a Server Component:** `FinanceKPIs.tsx`, `WelcomeBanner.tsx` (sem estado de browser).

---

## 3. Eficiência algorítmica

| Área                      | Complexidade atual                               | Alvo                                                       |
| ------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Decrypt PII em relatório  | O(rows × campos) + HKDF por campo                | O(rows × campos_selecionados) + HKDF cacheado por processo |
| Board atividades filtrado | O(N) transfer + O(N log N) sort JS               | Keyset page O(page) + counters agregados                   |
| Webhook last-delivery     | O(S × D)                                         | O(S + D) com Map                                           |
| Auditoria OFFSET          | O(offset + limit)                                | Keyset `(created_at, id)`                                  |
| Dashboard counts          | 4–5 scans em `associates` + 3–4 em `activities`  | 1–2 queries com `COUNT(*) FILTER`                          |
| Crypto HKDF               | Rederiva a cada `encrypt`/`decrypt`/`blindIndex` | Cache lazy imutável por `(master, context)`                |

Índices sugeridos (validar com `EXPLAIN` em staging):

```sql
-- Board / overdue
CREATE INDEX CONCURRENTLY idx_activities_open_updated
  ON activities (updated_at DESC, id DESC)
  WHERE status <> 'concluido';

-- Busca global / título
CREATE INDEX CONCURRENTLY idx_activities_title_trgm
  ON activities USING gin (title gin_trgm_ops);

-- Auditoria
CREATE INDEX CONCURRENTLY idx_audit_entity_created
  ON audit_logs (entity_type, created_at DESC, id DESC);
-- se LIKE em action for necessário:
CREATE INDEX CONCURRENTLY idx_audit_action_trgm
  ON audit_logs USING gin (action gin_trgm_ops);

-- Jurídico / email (padrão similar)
-- GIN trgm em title/internal_number e subject/sender
-- composto (status, created_at DESC, id)
```

> `CREATE INDEX CONCURRENTLY` **não** entra em `npm run db:migrate` (transacional). Seguir `docs/runbook.md`.

---

## 4. Estratégias de cache

### 4.1 Inventário

| Camada                         | Uso                                                                          | Avaliação                                                         |
| ------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `withCache` + `unstable_cache` | Dashboard (TTL 15s–1h), jurídico counters/detail, paginação associados (30s) | Bom padrão; tags largas demais                                    |
| React `cache()`                | `requireAuth`, `getMonthlyPaymentsData`                                      | Correto para dedupe **por request**; **não** substitui Data Cache |
| Assets PDF in-memory           | Fontes/logo em `oficios/pdf.ts`                                              | Bom, mas falta cache negativo                                     |
| HTTP                           | Integrações `no-store`; login privado; logo `max-age=0`                      | Relatório CSV / PDF ofício devem setar `private, no-store`        |
| Client polling                 | `useNotifications` 60s (sem consumidor ativo; layout usa Novu)               | Código morto ou documentar fallback                               |

### 4.2 Problemas

1. **Financeiro invalida tags que não existem**  
   Mutations usam `finance-monthly-${year}-${month}`, mas `getMonthlyPaymentsData` só tem React `cache()`. Invalidação é no-op; cada page hit refaz rows+count+aggregates.

2. **Tags largas**  
   `revalidateTag('dashboard')` derruba counters de atividades e aniversários quando só associados mudam. Editar um associado também `revalidatePath` em duplicata via `defineFormAction`.

3. **`withCache.maxEntries` não limita o Data Cache**  
   O Map process-local só evicta closures; entradas `unstable_cache` persistem. Closures por chave são desnecessárias — `unstable_cache` já incorpora args. Buscas de associados com `q` arbitrário explodem cardinalidade.

4. **Jurídico**  
   Mudança de status invalida details/notes de **todas** as consultas; não invalida tag `legal` dos counters. Tags estáticas por wrapper impedem granularidade por id.

### 4.3 Recomendações de cache

| Prioridade | Ação                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1         | Persistência de agregados mensais `(year, month)` 60–120s + páginas filtradas de baixa cardinalidade 15–30s; **não** cachear `q` livre sem normalização/teto |
| P1         | Tags finas: `dashboard:associates`, `dashboard:activities`, `legal:summary`, `legal:consultation:${id}`, `finance:${year}:${month}`                          |
| P1         | Um único `unstable_cache` por namespace + args normalizados; remover Map de closures ou usá-lo só como memo de factory estável                               |
| P1         | Após mutação: `updateTag` (read-your-writes) ou `revalidateTag(..., 'max')` de forma consistente; remover `revalidatePath` duplicado                         |
| P2         | Cachear `getPendingActions`, admins/associates do board, lista default de ofícios; **não** cachear busca global `%term%`                                     |
| P2         | Logo versionado com `immutable` longo; downloads sensíveis com `Cache-Control: private, no-store`                                                            |

---

## 5. Plano de otimização sugerido (ondas)

### Onda A — queries e pool (alto ROI, baixo risco de UX)

1. Consolidar metrics de associados do dashboard em **uma** query `COUNT(*) FILTER`.
2. Consolidar metrics de atividades + status em **uma** agregação.
3. Sempre limitar board de atividades; counters via aggregates.
4. Projeção estreita em `findOfficialLetters`.
5. Anti-join SQL + remover count duplicado em financeiro.

### Onda B — cache

1. `withCache` / tags finas + financeiro persistente.
2. Corrigir invalidação jurídico (summary vs detail vs notes).
3. Normalizar chaves de busca de associados.

### Onda C — CPU / memória / crypto

1. Cache de chaves HKDF por processo.
2. Relatório: projetar/descriptografar só colunas selecionadas; CSV em batches/stream.
3. Cron financeiro em batches `FOR UPDATE SKIP LOCKED`.
4. Assets PDF + cache negativo.

### Onda D — frontend

1. Bell leve + carregar Novu só ao abrir inbox.
2. Tiptap on-focus / passo “Editar formatação”.
3. Split client-safe de search-params (sem Zod/Drizzle).
4. Remover `'use client'` de KPIs/banner puros.

### Onda E — índices e ops

1. Índices listados na §3 via janela `CONCURRENTLY`.
2. Keyset em auditoria e notas jurídicas.
3. Load-test pool; limpar código morto de notificações polling.

---

## 6. Métricas de sucesso

| Métrica                                 | Baseline (esta auditoria) | Alvo                                  |
| --------------------------------------- | ------------------------- | ------------------------------------- |
| Queries no cold dashboard               | 11                        | ≤ 4                                   |
| First-load + Novu em rota tipica `/app` | ~280 KiB gzip             | < 180 KiB (Novu lazy)                 |
| Ofícios novo + editor                   | ~442 KiB gzip fetch       | < 220 KiB até abrir editor            |
| Export 5k linhas (CPU decrypt)          | 7× rows HKDF+AES          | só colunas pedidas + HKDF 1×/contexto |
| Board filtrado                          | ilimitado                 | page size ≤ 200 + counters            |

Instrumentação sugerida (sem mudar produto ainda): logs estruturados de duração por query tag (`dashboard.associates_metrics`, `reports.export`), e `ANALYZE=true` no CI opcional para regressão de bundle.

---

## 7. O que já está bem

- `statement_timeout`, `application_name`, detecção de pooler.
- Dashboard/jurídico com TTL escalonado e tags (base para refinar).
- `optimizePackageImports` para lucide, tiptap, dnd, novu, pdf-lib.
- Trigram em associados; paginação no cadastro.
- PDF: cache in-memory de bytes de fonte/logo quando existem.
- Auth: React `cache()` em `requireAuth` (dedupe correto por request).
- Integrações HTTP: `cache-control: no-store`.

---

## Referências de código

- Cache: `src/lib/cache/with-cache.ts`, `src/lib/dashboard/queries.ts`, `src/lib/finance/queries.ts`, `src/lib/juridico/queries.ts`
- Pool: `src/lib/db/index.ts`
- Relatórios: `src/lib/reports/{queries,service,csv}.ts`
- Atividades: `src/lib/activities/repository.ts`
- Crypto: `src/lib/crypto/{index,pii}.ts`
- Layout/Novu: `src/app/app/layout.tsx`, `src/components/NotificationInboxWrapper.tsx`
- Next: `next.config.ts`
