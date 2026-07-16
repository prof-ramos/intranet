# Plano 049: Tornar falhas terminais de webhook realmente não retentáveis

> **Instruções ao executor**: preserve deliveries históricas e não crie replay
> automático. Replay manual explícito pode ser proposto depois, mas não deve
> reaproveitar o claim automático.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/integrations/webhooks/service.ts src/lib/integrations/webhooks/service.test.ts src/lib/integrations/webhooks/repository.ts src/lib/integrations/webhooks/repository.test.ts src/lib/db/schema/integrations.ts`

## Status

- **Prioridade**: P2
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: bug
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

Uma resposta 4xx terminal é gravada como `failed`, mas o dispatcher a envia de
novo enquanto `attempt < 5`; eventos `failed` também voltam ao batch claim. Isso
pode duplicar efeitos remotos e impede uma dead-letter queue estável.

## Estado atual

- `service.ts:71-77` distingue status retentável.
- `service.ts:217-241` grava não retentável como `failed` sem `nextRetryAt`.
- `service.ts:269-289` só considera `failed` terminal após cinco tentativas.
- `repository.ts:182-197` inclui eventos `failed` no claim automático.
- `repository.ts:227-243` descreve `failed` como dead-letter queue.
- `service.test.ts:179-198` prova gravação do 403, mas não uma segunda rodada.

## Comandos necessários

| Finalidade | Comando                                                                                 | Resultado esperado |
| ---------- | --------------------------------------------------------------------------------------- | ------------------ |
| Service    | `npx vitest run src/lib/integrations/webhooks/service.test.ts`                          | todos passam       |
| Repository | `npx vitest run src/lib/integrations/webhooks/repository.test.ts`                       | todos passam       |
| Gates      | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0       |

## Escopo

**Dentro do escopo**:

- `src/lib/integrations/webhooks/service.ts` e teste
- `src/lib/integrations/webhooks/repository.ts` e teste
- `advisor-plans/README.md`

**Fora do escopo**:

- Nova migration/status enum.
- UI/API de replay manual ou apagar deliveries.
- Concorrência/fan-out, tratada no Plano 050.
- Alterar quais HTTP codes são retentáveis sem decisão separada.

## Fluxo Git

- Branch: `advisor/049-webhook-terminal-delivery-dlq`
- Commit: `fix(webhooks): keep terminal deliveries in dead letter state`
- Não publique sem autorização.

## Etapas

### Etapa 1: Tornar `failed` terminal por subscription

Ao encontrar delivery anterior `status='failed'`, retorne `failed` sem fetch,
independentemente do attempt. `retry_scheduled` continua obedecendo
`nextRetryAt`/máximo. Não infira retry pela mensagem de erro.

**Verificar**: novo teste faz duas rodadas após HTTP 403 e conta um único fetch.

### Etapa 2: Corrigir status agregado

Se não há retries pendentes e existe qualquer subscription terminal, marque o
evento como `failed`, mesmo que outras tenham sido entregues. O detalhe de entrega
parcial permanece nas rows de deliveries; o evento não pode ficar
`partially_delivered` reclamável para sempre.

**Verificar**: tabela de testes cobre todas delivered, retry pendente, todas
failed e delivered+failed terminal.

### Etapa 3: Excluir `failed` do claim automático

Remova `failed` de `lockAndFetchDispatchableEvents` e do claim normal por ID. Um
pedido futuro de replay deve usar função explícita, autorizada e testada; não
abra exceção silenciosa neste plano.

**Verificar**: repository test inspeciona predicado/resultado e prova que evento
failed não é reclamado.

### Etapa 4: Rodar gates

Execute testes focados e sequência oficial.

## Plano de testes

- 403/400 gera uma delivery terminal e zero retries subsequentes.
- 408/429/5xx continuam agendando retry.
- Máximo de tentativas termina em failed.
- Mix delivered+failed termina evento em failed e não é reclamado.

## Critérios de conclusão

- [ ] `failed` nunca é reenviado automaticamente.
- [ ] Claim de batch não seleciona eventos failed.
- [ ] Retry de códigos temporários permanece funcional.
- [ ] Tests e gates passam; índice atualizado.

## Condições de STOP

- Existe contrato público documentado que usa `dispatchDomainEventById` como
  replay de failed.
- Corrigir status exige migration/novo enum.
- Outra rotina depende de `failed` estar no batch automático.

## Notas de manutenção

Replay manual deve criar uma intenção auditável distinta; não altere delivery
histórica nem reabra implicitamente o evento terminal.
