# Plano 053: Paginar mensalidades no servidor sem degradar os KPIs

> **Instruções ao executor**: os KPIs devem refletir todo o conjunto filtrado,
> não apenas a página visível. Preserve optimistic concurrency das ações de
> pagamento e reset de página ao alterar filtros.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/finance/repository.ts src/lib/finance/repository.test.ts src/lib/finance/queries.ts src/lib/finance/search-params.ts src/lib/finance/search-params.test.ts src/app/app/financeiro/mensalidades/page.tsx src/app/app/financeiro/mensalidades/MonthlyPaymentsTable.tsx src/app/app/financeiro/mensalidades/FinanceKPIs.tsx src/lib/pagination.ts`

## Status

- **Prioridade**: P2
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: perf
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

O URL já aceita `page`, mas a página não o passa à query e o repository retorna
todos os associados. Toda navegação consulta, serializa e hidrata a população
completa. Paginação ingênua quebraria KPIs, portanto lista, total e agregados
precisam ser calculados separadamente sob os mesmos filtros.

## Estado atual

- `finance/search-params.ts:5-16,33-50` modela `page`.
- `mensalidades/page.tsx:44-56` omite `currentFilters.page` na consulta.
- `finance/repository.ts:169-230` não usa `limit`, `offset` ou count.
- `MonthlyPaymentsTable.tsx:58-63,163-167,469-592` recebe/renderiza o array inteiro.
- `FinanceKPIs.tsx:27-47` deriva KPIs do array completo em memória.
- Exemplar: `juridico/repository.ts:86-140` retorna `{ rows, total }` com
  `normalizePagination`, e sua página renderiza Anterior/Próxima.

## Comandos necessários

| Finalidade        | Comando                                                                                   | Resultado esperado                 |
| ----------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| Repository/search | `npx vitest run src/lib/finance/repository.test.ts src/lib/finance/search-params.test.ts` | todos passam                       |
| UI                | `npx vitest run src/app/app/financeiro/mensalidades`                                      | todos os testes encontrados passam |
| Gates             | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build`   | todos saem 0                       |

## Escopo

**Dentro do escopo**:

- arquivos listados no drift check
- teste de componente/página novo no mesmo diretório, se necessário
- `advisor-plans/README.md`

**Fora do escopo**:

- Alterar regras de mensalidade, statuses ou actions de escrita.
- Cursor pagination, infinite scroll ou cache externo.
- Mudar o design dos KPIs além do contrato de dados.
- Migration/index sem prova por query plan e plano separado.

## Fluxo Git

- Branch: `advisor/053-monthly-payments-pagination`
- Commit: `perf(finance): paginate monthly payments server side`
- Não publique sem autorização.

## Etapas

### Etapa 1: Definir contrato paginado

Faça o repository aceitar `page` e `pageSize` normalizados e retornar:
`{ rows, total, aggregates }`. Defina tipo explícito para agregados usados nos
KPIs: total, pagos, pendentes (incluindo ausência de row), atrasados, isentos,
cancelados, exterior, folha e boleto/pix.

**Verificar**: typecheck passa e query list usa `limit`/`offset` estáveis com
ordem determinística por nome+ID.

### Etapa 2: Compartilhar filtros entre rows/count/agregados

Extraia construção de condições para que `q`, status, method e location sejam
idênticos nas três queries. Calcule KPIs em SQL/queries leves, não buscando todas
as rows. Preserve `coalesce` do status/método efetivo e aliases de Brasil usados
em `repository.test.ts`.

**Verificar**: testes compilam SQL dos filtros e confirmam total/agregados sob
cada filtro.

### Etapa 3: Integrar página e componentes

Passe `currentFilters.page`, use `rows` na tabela e `aggregates` em
`FinanceKPIs`. Adicione totalPages e controles Anterior/Próxima preservando ano,
mês e filtros. Ao mudar busca/status/method/location, force `page=1`.

**Verificar**: teste de URL prova preservação de filtros e reset de página.

### Etapa 4: Tratar bordas

Clamp de página maior que total deve resultar em página efetiva válida ou redirect
canônico; zero resultados mostra estado vazio e KPIs zero. Após mutation/revalidate,
a página atual continua consistente.

**Verificar**: testes para primeira, última, além da última e zero resultados.

### Etapa 5: Rodar gates

Execute sequência oficial. Inspecione props serializadas para garantir somente
uma página de PII operacional.

## Plano de testes

- `limit`, `offset`, total e ordem estável.
- KPIs globais sob cada filtro, independentes da página.
- Reset para página 1 ao filtrar/buscar.
- Navegação preserva ano/mês/filtros.
- Empty/last/out-of-range page.

## Critérios de conclusão

- [ ] O parâmetro `page` altera rows consultadas/renderizadas.
- [ ] No máximo `pageSize` associados são serializados.
- [ ] KPIs refletem todos os resultados filtrados.
- [ ] Controles e filtros têm testes.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- Agregados corretos exigem redefinir semântica de status/método efetivo.
- Query paginada requer índice/migration para desempenho aceitável.
- A UI depende comprovadamente de todas as rows para uma operação em lote.

## Notas de manutenção

Novos filtros devem entrar no builder compartilhado de rows/count/agregados.
Revisores devem conferir que KPIs nunca são calculados somente sobre `rows`.
