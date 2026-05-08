# Revisão de Performance

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Resumo

O app é pequeno e usa Server Components, o que ajuda a manter o client bundle baixo. Os riscos principais estão em consultas sem ordenação/índices suficientes, dashboard com múltiplas agregações independentes, busca textual com `LIKE '%termo%'`, importação de muitos ícones e histórico de pressão de memória com `next dev`.

## Gargalos identificados

### Busca por nome com `LIKE '%q%'`

`src/app/app/associados/page.tsx` filtra por `like(associates.fullName, `%${escapedQ}%`)`. Mesmo com índice em `fullName`, padrões com wildcard inicial tendem a não aproveitar índice B-tree de forma eficiente.

Recomendações:

- Limitar tamanho mínimo/máximo de busca.
- Adicionar debounce se a busca virar client-side no futuro.
- Avaliar SQLite FTS5/libSQL full-text search para busca por nome, lotação, SIAPE e email.
- Adicionar ordenação explícita para paginação estável.

### Paginação sem `orderBy`

A listagem usa `limit`/`offset`, mas não define ordenação. Isso pode gerar páginas instáveis conforme inserts/updates acontecem.

Recomendações:

- Ordenar por `fullName` e `id`.
- Criar índice compatível com filtros e ordenação, por exemplo status + nome, se o banco demonstrar necessidade.
- Para bases maiores, avaliar cursor pagination.

### Dashboard faz várias consultas independentes

`getStripe()` executa quatro `count()` em paralelo. Para o volume atual (~763 associados), isso é aceitável. Conforme o dashboard crescer, muitos KPIs independentes podem aumentar latência e carga.

Recomendações:

- Medir antes de otimizar.
- Consolidar contagens de associados em agregações condicionais quando fizer sentido.
- Criar índices para `associationStatus`, `contributionStatus`, `activities.status` e `activities.dueDate`.
- Considerar cache curto por usuário/role para métricas de dashboard se os dados não precisarem ser instantâneos.

### Ícones e imports

O projeto usa `lucide-react` em várias telas. `next.config.ts` já configura `experimental.optimizePackageImports: ['lucide-react']`, o que é positivo.

Recomendações:

- Manter imports nomeados.
- Monitorar bundle analysis quando as rotas client crescerem.

### Ambiente de desenvolvimento

Os documentos do repo registram congelamentos anteriores do `next dev` por pressão de memória. O projeto já força `next dev --webpack` como padrão e mantém `dev:turbo` separado.

Recomendações:

- Continuar usando `scripts/run-dev-60s.sh` para diagnóstico controlado.
- Evitar expandir testes ou scripts que disparem builds concorrentes sem necessidade.
- Rodar `next build --webpack` antes de considerar Turbopack como problema.

## Estratégias de cache

Hoje não há cache explícito para consultas de dashboard/listagem. Isso é aceitável para MVP administrativo, mas três pontos merecem desenho:

- `requireAuth` usa `cache()` no render e evita consulta duplicada ao admin.
- KPIs de dashboard poderiam ter cache por curto período se forem apenas informativos.
- Dados LGPD não devem ser armazenados em caches compartilhados sem chave por usuário/role e política de invalidação.

## Recomendações objetivas

1. Adicionar `orderBy(associates.fullName, associates.id)` na listagem.
2. Validar e limitar `page`/`q`.
3. Criar índices para campos usados em filtros e KPIs.
4. Trocar mocks do dashboard por consultas reais ou remover blocos não operacionais.
5. Medir consultas com dados reais antes de introduzir cache.
