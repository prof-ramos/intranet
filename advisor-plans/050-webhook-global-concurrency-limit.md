# Plano 050: Limitar globalmente a concorrência do dispatcher de webhooks

> **Instruções ao executor**: aplique limites fora de transações e sem descartar
> resultados. O Plano 049 deve estar concluído para evitar conflitos no mesmo
> service/repository.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/integrations/webhooks/service.ts src/lib/integrations/webhooks/service.test.ts src/lib/integrations/webhooks/repository.ts src/lib/db/index.ts src/lib/cron/auth.ts`

## Status

- **Prioridade**: P2
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: Plano 049
- **Categoria**: perf
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

Cada evento dispara todas as subscriptions em paralelo e o batch dispara até 100
eventos em paralelo. O fan-out multiplicativo pode abrir centenas de DNS/fetches
e writes enquanto o pool PostgreSQL padrão possui 10 conexões e cada request pode
aguardar 10 segundos.

## Estado atual

- `service.ts:263-292`: `subscriptions.map` + `Promise.allSettled` sem limite.
- `service.ts:329-338`: `pendingEvents.map` + `Promise.all` sem limite.
- `cron/auth.ts:42-50`: limite de chamada pode chegar a 100 eventos.
- `db/index.ts:35-43`: pool padrão `max: 10`.
- HTTP já está fora da transaction; preserve essa propriedade.

## Comandos necessários

| Finalidade | Comando                                                                                 | Resultado esperado |
| ---------- | --------------------------------------------------------------------------------------- | ------------------ |
| Focado     | `npx vitest run src/lib/integrations/webhooks/service.test.ts`                          | todos passam       |
| Gates      | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0       |

## Escopo

**Dentro do escopo**:

- `src/lib/integrations/webhooks/service.ts` e teste
- helper pequeno de concorrência sob `src/lib/integrations/webhooks/` e teste
- configuração/env somente se já houver padrão seguro para número opcional
- `advisor-plans/README.md`

**Fora do escopo**:

- Aumentar pool DB, frequência do cron ou timeout HTTP.
- Nova fila/serviço externo.
- Recolocar fetch dentro de transaction.
- Alterar retry/DLQ do Plano 049.

## Fluxo Git

- Branch: `advisor/050-webhook-global-concurrency-limit`
- Commit: `perf(webhooks): bound global delivery concurrency`
- Não publique sem autorização.

## Etapas

### Etapa 1: Criar primitive de concorrência testável

Implemente mapper/semaphore local sem dependência nova. Ele deve preservar ordem
dos resultados, continuar após rejeições e nunca exceder o limite. Valide limite
como inteiro positivo.

**Verificar**: teste com promises controladas mede pico ativo exato e cobertura de
erro sem deadlock.

### Etapa 2: Aplicar um limite compartilhado às entregas

Crie um limiter por execução de `dispatchPendingDomainEvents` e passe-o a todos
os eventos, de modo que o teto seja global, não `eventos × teto`. Para
`dispatchDomainEventById`, crie limiter local equivalente. Valor inicial deve ser
conservador em relação ao pool 10 (por exemplo 5–10) e constante explícita.

**Verificar**: vários eventos com várias subscriptions nunca ultrapassam o teto
global no teste.

### Etapa 3: Limitar orquestração de eventos

Não inicie 100 funções de evento de uma vez. Use limite menor ou igual ao de
entregas, mantendo lista de resultados na ordem dos eventos reclamados. Nenhum
evento pode ser perdido quando uma entrega rejeita.

**Verificar**: 20 eventos sintéticos concluem todos, com pico medido e resultados
completos.

### Etapa 4: Rodar gates

Execute focused/gates e confirme que `db.transaction` continua ausente do path de
dispatch HTTP.

## Plano de testes

- Pico global não excede o limite com N eventos × M subscriptions.
- Ordem/quantidade de resultados preservadas.
- Rejeição de uma entrega não bloqueia as demais.
- Single-event dispatch usa o mesmo teto.
- Recuperação de eventos `processing` continua intacta.

## Critérios de conclusão

- [ ] Concorrência de fetch/write possui teto global explícito.
- [ ] Batch de 100 não inicia 100 eventos simultâneos.
- [ ] Resultados e retries não são descartados.
- [ ] Nenhum fetch ocorre em transaction.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- Limitar localmente rompe o timeout máximo da função no volume suportado.
- O dispatcher foi movido para fila externa por mudança posterior.
- Implementação exige dependência nova ou alteração do pool DB.

## Notas de manutenção

O teto deve ser revisto junto com pool, timeout e volume de subscriptions. Métricas
de duração/pico podem orientar ajuste, mas não remova o limite para ganhar throughput.
