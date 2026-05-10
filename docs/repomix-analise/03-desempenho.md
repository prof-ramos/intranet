# Análise de Desempenho — ASOF Intranet

**Data:** 2026-05-10  
**Base:** Next.js 16.2.6, React 19, PostgreSQL/Supabase, Drizzle ORM  
**Escala:** ~763 associados, ~3 administradores, ~220 postos

---

## 1. Componentes Monolíticos (Gargalo Crítico)

### 1.1 `AtividadesBoard.tsx` — 10.7k tokens / 43.3k chars

O maior arquivo do projeto. Acumula responsabilidades que deveriam estar separadas:

| Responsabilidade | Linhas estimadas | Impacto |
|---|---|---|
| UI de Kanban (drag/drop, cards, colunas) | ~400 | Bundle size |
| Estado local (filtros, modais, drawers) | ~300 | Re-render desnecessário |
| Regras de negócio (atrasos, prioridades, reatribuição) | ~200 | Difícil testar |
| Modais e drawers inline | ~150 | Acoplamento |
| Lógica de filtros avançados | ~100 | Complexidade |

**Recomendação:** Quebrar em subcomponentes por responsabilidade:
- `BoardColumn.tsx` — renderização de coluna
- `ActivityCard.tsx` — card individual com drag/drop
- `FilterBar.tsx` — barra de filtros
- `ActivityDrawer.tsx` — painel lateral de detalhes
- `ReassignModal.tsx` — modal de reatribuição
- `useActivityFilters.ts` — hook de estado de filtros

**Impacto esperado:** Redução de ~60% no bundle da rota `/app/atividades`, melhor tree-shaking, testabilidade.

### 1.2 `NovaAtividadeForm.tsx` — 5.4k tokens / 22.1k chars

Formulário complexo com pickers, tags, validação e estado local acoplados.

**Recomendação:**
- Extrair pickers para `src/components/pickers/`
- Extrair validação para `src/lib/activities/validation.ts`
- Criar hook `useActivityForm.ts` para estado

### 1.3 `logo-asof.svg` — 103.9k tokens / 178.8k chars

Um único SVG representa **42.2% do pacote Repomix inteiro**. Se for carregado inline ou no bundle, impacta significativamente.

**Recomendação:**
- Verificar se está sendo importado como componente React (pior caso)
- Se sim, mover para `<img src>` ou `next/image` com `priority={false}`
- Considerar otimização com SVGO
- Avaliar se uma versão simplificada ou PNG/WebP seria aceitável

---

## 2. Estratégias de Cache (Ausentes)

### 2.1 Server Components — Sem cache

Dashboard executa 9 queries a cada renderização. Com ~763 associados, isso é rápido hoje, mas escalará mal.

| Query | Frequência | Cacheável? |
|---|---|---|
| `countActiveAssociates` | Cada acesso ao dashboard | Sim (curto prazo) |
| `countOpenActivities` | Cada acesso ao dashboard | Sim (muito curto) |
| `countOverdueActivities` | Cada acesso ao dashboard | Sim (muito curto) |
| `getActivitiesByStatus` | Cada acesso ao dashboard | Sim (muito curto) |
| `getTopRegions` | Cada acesso ao dashboard | Sim (médio prazo) |
| `getKanbanCards` | Cada acesso ao dashboard | Parcialmente |

**Recomendação:**
```typescript
import { unstable_cache } from 'next/cache';

export const countActiveAssociates = unstable_cache(
  async () => { /* ... */ },
  ['active-associates-count'],
  { revalidate: 300 } // 5 minutos
);
```

Queries que mudam frequentemente (atividades) devem ter TTL curto (10-30s). Queries estáveis (associados, regiões) podem ter TTL maior (5-15min).

### 2.2 Route Handler `/api/reports` — Sem cache

Relatório CSV é gerado do zero a cada download. Se 2 usuários baixarem o mesmo relatório em sequência, o banco é consultado 2x.

**Recomendação:** Considerar `unstable_cache` para queries de relatório com invalidação via tag quando dados mudam.

### 2.3 `proxy.ts` — Sem cache de validação JWT

A cada requisição de página (incluindo assets estáticos que passam pelo matcher), o JWT é verificado com `jose`. Isso é rápido (criptografia simétrica), mas sem cache de sessão.

**Impacto atual:** Baixo. JWT HMAC é sub-milissegundo.  
**Risco futuro:** Se o matcher incluir mais rotas ou se houver muitos assets, a sobrecarga cresce.

**Recomendação:** Manter como está. O custo é aceitável e a simplicidade é preferível à cache de sessão que introduziria complexidade de invalidação.

---

## 3. Ausência de `loading.tsx`

Nenhuma rota define `loading.tsx`. Quando queries de banco são lentas (ex: primeira conexão após cold start), o usuário vê tela em branco até o Server Component completar.

**Recomendação:**
- Criar `src/app/app/loading.tsx` com skeleton genérico
- Criar `src/app/app/associados/loading.tsx` com skeleton de tabela
- Criar `src/app/app/atividades/loading.tsx` com skeleton de kanban

---

## 4. Bundle e Build

### 4.1 PostCSS/Tailwind Workers

`scripts/run-dev-60s.sh` foi criado especificamente porque `next dev` com PostCSS/Tailwind causava pressão de memória em máquinas com 8 GB RAM.

**Status:** Mitigado com wrapper de diagnóstico.  
**Recomendação:** Monitorar após upgrades do Tailwind/PostCSS. Considerar `TAILWIND_MODE=watch` ou similar se o problema persistir.

### 4.2 `optimizePackageImports`

`next.config.ts` já configura `optimizePackageImports: ["lucide-react"]`. Isso é positivo — evita carregar todos os ícones.

**Recomendação:** Adicionar `"@libsql/client"` ao `optimizePackageImports` se for usado em runtime (hoje é `serverExternalPackages`, o que já é correto).

---

## 5. Eficiência Algorítmica

### 5.1 Dashboard — Agregações em paralelo

As 9 queries do dashboard rodam em `Promise.all()`. Isso é eficiente para o porte atual.

**Risco futuro:** Se `getKanbanCards` crescer além de 20 cards, a query com `LEFT JOIN` pode ficar lenta. Adicionar índice em `activities.associate_id` seria preventivo.

### 5.2 Busca de Associados — `LIKE` com escape

```typescript
sql`${associates.fullName} like ${pattern} escape '\\'`
```

Full-text search via `LIKE` escala mal para volumes maiores. Com ~763 registros, ainda é aceitável.

**Recomendação futura:** Migrar para `pg_trgm` (trigram) ou Full-Text Search do PostgreSQL se o volume crescer significativamente.

### 5.3 Rate Limiter — Query por tentativa

Cada chamada a `consume()` faz 1-2 queries no banco (SELECT + possível INSERT/UPDATE). Isso é correto para consistência multi-instância, mas adiciona latência ao login.

**Impacto:** ~5-15ms extra por login. Aceitável.  
**Otimização futura:** Adicionar índice `idx_login_attempts_email` já existe. Considerar cache em memória com fallback ao banco para reduzir latência em 90% dos casos.

---

## 6. Banco de Dados

### 6.1 Índices existentes

Audit logs têm índices em `entity_type + entity_id`, `performed_by`, `created_at`. Boa cobertura.

**Índices recomendados (preventivos):**
- `activities.associate_id` — para JOINs do kanban
- `activities.status + priority + due_date` — para filtros do dashboard
- `associates.full_name` — para busca (se não houver índice implícito)

### 6.2 N+1 Query Risk

`[id]/page.tsx` (perfil do associado) busca atividades do associado. Se a lista for longa e cada atividade precisar de dados relacionados, isso pode virar N+1.

**Recomendação:** Verificar se há queries dentro de loops. Extrair para `src/lib/activities/queries.ts` com JOINs apropriados.

---

## 7. Implementações Realizadas

### 2026-05-10

1. **`loading.tsx` criados** — `src/app/app/loading.tsx`, `src/app/app/associados/loading.tsx`, `src/app/app/atividades/loading.tsx`
2. **`unstable_cache` aplicado** — Todas as 9 queries do dashboard com TTL apropriado:
   - Dados estáveis (associados, regiões): 5 minutos
   - Dados moderados (contribuições): 2 minutos
   - Dados voláteis (atividades): 30 segundos
   - Dados em tempo real (urgentes, kanban): 15 segundos
3. **`logo-asof.svg` substituído** — Arquivo local removido; agora carregado via `https://asof.org.br/img/asof-dark.svg`

## 8. Recomendações Pendentes

### Médio prazo

4. **Quebrar `AtividadesBoard.tsx`** em subcomponentes — reduz bundle e melhora manutenibilidade
5. **Adicionar índices preventivos** em `activities.associate_id`
6. **Cache de relatórios** com invalidação por tag

### Longo prazo

7. **Full-Text Search** em associados se volume > 5.000 registros
8. **Paginação cursor-based** para listagens que possam crescer
9. **Particionamento de `audit_logs`** por data se volume explodir

---

## Resumo por Dimensão

| Dimensão | Avaliação | Nota |
|---|---|---|
| **Bundle size** | Risco: componentes monolíticos + SVG gigante | 5/10 |
| **Cache** | Inexistente — oportunidade óbvia | 3/10 |
| **Queries DB** | Paralelas e razoáveis, mas sem cache | 6/10 |
| **Memory (dev)** | Mitigado com wrapper, monitorar upgrades | 6/10 |
| **UX percebida** | Sem skeletons — tela branca em queries lentas | 4/10 |
| **Algoritmos** | Adequados para o porte atual | 7/10 |

**Direção recomendada:** Implementar `loading.tsx` + `unstable_cache` primeiro (rápido, alto impacto). Depois quebrar `AtividadesBoard.tsx`. Finalmente otimizar bundle com SVG.
