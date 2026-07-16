# Plano 052: Centralizar o calendário institucional em America/Sao_Paulo

> **Instruções ao executor**: diferencie instante UTC de data civil institucional.
> Não converta timestamps persistidos nem relatórios explicitamente UTC. O Plano
> 051 deve estar concluído para evitar conflito em `oficios/service.ts`.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/utils/date.ts src/lib/utils/date.test.ts src/lib/oficios/service.ts src/lib/oficios/service.test.ts src/lib/juridico/service.ts src/lib/juridico/service.test.ts src/lib/finance/repository.ts src/lib/finance/search-params.ts src/lib/finance/search-params.test.ts src/lib/activities/transformations.ts src/lib/activities/transformations.test.ts src/app/app/page.tsx`

## Status

- **Prioridade**: P2
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: Plano 051
- **Categoria**: tech-debt
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

Vercel opera em UTC. Entre 21h e meia-noite em São Paulo, `new Date()` pode
avançar dia, mês ou ano institucional. Financeiro já contém um workaround local,
mas Ofícios, números jurídicos, conclusão de atividades, defaults de mensalidade
e dashboard usam convenções diferentes.

## Estado atual

- `finance/repository.ts:126-133` reconstrói horário São Paulo via
  `toLocaleString`, explicitando a regra de negócio.
- `oficios/service.ts:54-56` e `juridico/service.ts:28-33` usam ano do host.
- `finance/search-params.ts:63-68` usa mês/ano do host para defaults.
- `activities/transformations.ts:7-14` gera data civil com ISO UTC.
- `app/page.tsx:15-20` formata “hoje” sem `timeZone`.
- `utils/date.ts:103-124` calcula “hoje” em UTC; timestamps absolutos e CSVs UTC
  não devem ser alterados indiscriminadamente.

## Comandos necessários

| Finalidade | Comando                                                                                                                                                                                       | Resultado esperado |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Datas      | `npx vitest run src/lib/utils/date.test.ts src/lib/activities/transformations.test.ts src/lib/finance/search-params.test.ts src/lib/oficios/service.test.ts src/lib/juridico/service.test.ts` | todos passam       |
| Gates      | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build`                                                                                                       | todos saem 0       |

## Escopo

**Dentro do escopo**:

- helper e testes em `src/lib/utils/date.ts`
- consumidores de decisões de data civil listados no drift check
- testes correspondentes
- `advisor-plans/README.md`

**Fora do escopo**:

- Colunas `timestamptz`, migrations ou backfill.
- Relatórios/CSVs documentados em UTC.
- Instalar Temporal/date-fns/luxon.
- Mudar prazos históricos ou interpretação de date-only persistido.

## Fluxo Git

- Branch: `advisor/052-business-calendar-sao-paulo`
- Commit: `refactor(date): centralize asof business calendar`
- Não publique sem autorização.

## Etapas

### Etapa 1: Criar helpers de calendário injetáveis

Adicione `BUSINESS_TIME_ZONE = 'America/Sao_Paulo'` e helpers que recebem
`now: Date = new Date()` e retornam parts `year/month/day`, ISO date-only e
formatação pt-BR. Use `Intl.DateTimeFormat(...).formatToParts`; não reparseie
string localizada como `Date`.

**Verificar**: testes congelados cobrem `2026-01-01T01:00Z` como 31/12/2025 em
São Paulo e `2026-01-01T04:00Z` como 01/01/2026.

### Etapa 2: Migrar decisões de ano/mês

Use helper para ano de Ofícios/Jurídico e defaults de mensalidade. Preserve
injeção de `now` nos parsers/testes. O lock anual do Plano 051 deve receber o ano
institucional calculado.

**Verificar**: testes de virada provam números 2025 antes da meia-noite BRT e 2026
depois dela.

### Etapa 3: Migrar data civil da UI/atividade

Use helper para `completedAt` date-only e para o texto “hoje” do dashboard.
Atualize `daysFromToday`/`daysSince` somente nos consumidores em que a semântica
é data civil ASOF; preserve funções UTC necessárias a relatórios.

**Verificar**: testes de atividade/painel não avançam data às 21h BRT.

### Etapa 4: Remover workaround local do Financeiro

Substitua `toLocaleString` + reparsing pelos parts do helper. Confirme a mesma
regra de overdue nos limites de mês.

**Verificar**: testes existentes e novos de Financeiro passam.

### Etapa 5: Rodar gates

Execute sequência oficial e busca por decisões de negócio restantes com
`new Date().getFullYear()`/`getMonth()` nos módulos-alvo. Classifique ocorrências;
não faça substituição mecânica global.

## Plano de testes

- Antes/depois da meia-noite BRT, virada de mês e ano.
- Ano de número jurídico/Ofício.
- Default de mensalidade.
- Data de conclusão e “hoje” no dashboard.
- Timestamps UTC/CSV permanecem inalterados.

## Critérios de conclusão

- [ ] Decisões de data civil alvo usam o helper São Paulo.
- [ ] Helpers aceitam relógio injetado e têm testes de fronteira.
- [ ] Nenhuma migration ou conversão de timestamp foi feita.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- Uma ADR define timezone institucional diferente.
- Consumidor alvo representa instante, não data civil.
- Mudança exige backfill de valores históricos.
- Plano 051 ainda modifica `oficios/service.ts` em paralelo.

## Notas de manutenção

Novas regras devem declarar se trabalham com instante UTC, date-only ou calendário
ASOF. Revisores devem rejeitar `toLocaleString` seguido de `new Date(...)`.
