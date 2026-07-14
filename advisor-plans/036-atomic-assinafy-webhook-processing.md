# Plano 036: Tornar atômicos o claim e os efeitos do webhook Assinafy

> **Instruções ao executor**: siga este plano passo a passo, executando cada
> verificação. Em uma condição de STOP, pare e reporte; não improvise. Ao final,
> atualize o status em `advisor-plans/README.md`, salvo orientação contrária.
>
> **Verificação de drift (primeiro comando)**:
> `git diff e0be30d..HEAD -- src/lib/assinafy src/app/api/webhooks/assinafy src/lib/db/schema/integrations.ts vitest.integration.config.ts`
> Compare qualquer mudança com o estado descrito abaixo e pare se houver
> divergência semântica.

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: bug
- **Planejado em**: commit `e0be30d`, 2026-07-14

## Por que isso importa

A rota Assinafy consulta o nonce, aplica status/outbox/notificações e só então
insere o nonce. Duas entregas simultâneas podem passar pela consulta e executar
efeitos antes de uma perder a disputa da constraint única. O claim do nonce e
todas as escritas de domínio precisam confirmar ou reverter juntos, garantindo
um único proprietário do evento e retry seguro após falha.

Este plano preserva temporariamente o mapeamento HTTP atual para falhas internas.
O Plano 037 muda `failed` para HTTP 500 depois que este plano criar um contrato
de resultado inequívoco.

## Estado atual

- `route.ts:62-80` faz `SELECT` do par
  `(key_id='assinafy', signature=event.id)`.
- `route.ts:82-96` chama o service e insere o nonce depois.
- `service.ts:35-134` abre outra transação para status, evento e notificações.
- `repository.ts:6-12` lê o Ofício sem lock de linha. A serialização deve vir do
  claim único; não afirme que a leitura atual serializa entregas.
- Entregas com `event.id` distintos podem atualizar concorrentemente a mesma
  linha de Ofício. A leitura do Ofício dentro da transação deve usar
  `SELECT ... FOR UPDATE` no mesmo executor para evitar lost updates entre
  eventos diferentes do mesmo documento.
- `integrations.ts:204-215` já possui índice único `(keyId, signature)`; nenhuma
  migration é necessária.
- `verify-request.ts:106-123` exemplifica o claim com um único
  `INSERT ... ON CONFLICT DO NOTHING ... RETURNING`.
- `service.integration.test.ts:19-22` apenas importa o módulo, apesar de criar
  fixtures.
- Auditoria permanece best-effort após commit, sem passar executor transacional.

## Contrato alvo

`handleWebhookEvent` deve retornar uma união discriminada:

- `processed`: esta chamada adquiriu o claim e confirmou os efeitos;
- `duplicate`: outra chamada já confirmou o nonce;
- `ignored`: tipo desconhecido ou Ofício ausente; o nonce confirma para evitar
  repetição inútil;
- `failed`: a transação, inclusive o nonce, foi revertida e o evento pode ser
  tentado novamente;
- `invalid`: `event.id` ausente ou diferente de um número inteiro positivo seguro (menor ou igual a `Number.MAX_SAFE_INTEGER`); o nonce não é persistido e a rota retorna erro terminal (HTTP 400), sem retry.

Não inclua exceções ou payloads no resultado público. O retorno `processed` deve
conter apenas campos de uma allowlist canônica definida pelo contrato do Plano
038: IDs de entidade, action name, actor ID e changedFields com nomes de campo.
Exclua exceções, payloads, PII, hashes e ciphertexts — tanto no retorno público
quanto nos logs. Logs devem continuar sem PII.

## Comandos necessários

| Finalidade | Comando | Resultado esperado |
| --- | --- | --- |
| Unit service | `npx vitest run src/lib/assinafy/service.test.ts` | todos passam |
| Unit rota | `npx vitest run src/app/api/webhooks/assinafy/route.test.ts` | todos passam |
| Integração Assinafy | `npx vitest run --config vitest.integration.config.ts src/lib/assinafy/service.integration.test.ts` | casos com PG real passam |
| Integração completa | `npm run test:integration` | passa ou skip documentado sem `.env.test.local` |
| Gate completo | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0, nessa ordem |

## Escopo

**Dentro do escopo**:

- `src/lib/assinafy/service.ts`
- `src/lib/assinafy/service.test.ts`
- `src/app/api/webhooks/assinafy/route.ts`
- `src/app/api/webhooks/assinafy/route.test.ts`
- `src/lib/assinafy/service.integration.test.ts`
- `src/lib/oficios/repository.ts` (se necessário para a query com row-locking)
- `advisor-plans/README.md` apenas para status

**Fora do escopo**:

- Schema/migrations; a constraint já existe.
- Resposta HTTP de retry; pertence ao Plano 037.
- Autenticação por secret/timestamp.
- Dispatcher genérico de webhooks.
- Chamadas ou credenciais do provedor.

## Fluxo Git

- Branch: `advisor/036-atomic-assinafy-webhook-processing`
- Commit sugerido: `fix(assinafy): process webhook nonce atomically`
- Não faça push nem abra PR sem instrução.

## Etapas

### Etapa 1: Criar resultado explícito e helper de claim

Em `service.ts`, exporte o tipo discriminado com os cinco estados: `processed | duplicate | ignored | failed | invalid`. Crie helper
interno que:

1. Valide `event.id` conforme o contrato vigente de `AssinafyWebhookEvent`:
   aceite somente número inteiro positivo seguro (`Number.isSafeInteger(event.id)`) e rejeite valor ausente, nulo,
   string, não finito, fracionário, não positivo ou acima do limite seguro com `invalid` **sem**
   persistir nonce. Testes de runtime podem construir entradas malformadas por
   cast explícito, sem ampliar o tipo público nem editar `types.ts`;
2. Insira `integrationSignatureNonces` com:
   - `keyId = 'assinafy'`;
   - `signature = String(event.id)` (inteiro positivo após validação);
   - TTL já usado pela rota;
   - `onConflictDoNothing().returning({ id })`;
   - executor da transação, nunca `db` global.

O helper informa se o claim foi adquirido. Reuse o padrão de
`verify-request.ts`; não adicione leitura prévia.

**Verificar**: unit tests provam claim inicial e retorno `duplicate` quando
`returning` vem vazio, sem chamadas de status/outbox/notificação.

### Etapa 2: Colocar claim e efeitos na mesma transação

Mova o claim para o início da transação existente. Se não for adquirido,
retorne `duplicate`. Se adquirido:

1. mapeie/valide o tipo do evento;
2. encontre o Ofício usando o mesmo executor com bloqueio de linha (`SELECT ... FOR UPDATE` / `.for('update')` no Drizzle) para evitar condições de corrida de múltiplos webhooks atualizando o mesmo Ofício;
3. atualize o status Assinafy;
4. emita o evento de domínio;
5. crie notificações;
6. retorne argumentos de auditoria e estado `processed`.

Para evento desconhecido, retorne `ignored` dentro da transação, confirmando o
nonce. Para Ofício ausente: se a ausência for definitiva (ex.: tipo de evento
que exige Ofício já existente), retorne `ignored`; se for transitória (ex.:
Ofício pode ser criado posteriormente), reverta o nonce e propague `failed`
para permitir retry. Se qualquer escrita falhar, reverta tudo; o `catch` externo
faz log sanitizado e retorna `failed`. Audite somente `processed`, após commit,
usando `db` padrão.

**Verificar**: unit tests cobrem os cinco estados e confirmam o executor
transacional em todas as escritas com bloqueio de linha no Ofício. O teste de
integração com PG real deve cobrir chamadas concorrentes com IDs distintos disputando o mesmo Ofício.

### Etapa 3: Remover persistência de nonce da rota

Remova `SELECT` e `INSERT` de nonce da rota. Ela deve chamar
`handleWebhookEvent(event)` exatamente uma vez e tratar explicitamente os cinco
estados:

- `processed` → log sanitizado, 200;
- `duplicate` → log sanitizado, 200;
- `ignored` → log sanitizado, 200;
- `invalid` → log sanitizado, 400 terminal, sem retry;
- `failed` → log sanitizado (sem payload, sem PII, sem IDs internos), 200
  (preservado para o Plano 037).

Para `invalid` e `failed`, o log deve conter apenas `event.type` e o fato da
falha, nunca `event.id`, document ID, exceção ou mensagem de erro. O `catch`
defensivo da rota cobre rejeições inesperadas com 500 genérico.

Atualize mocks para representar o resultado do service. A rota não deve mais
importar `db`, predicados Drizzle nem `integrationSignatureNonces`.

**Verificar**:
`rg -n "integrationSignatureNonces|mockSelect|mockInsert" src/app/api/webhooks/assinafy`
não encontra referências da rota/teste.

### Etapa 4: Substituir o teste vazio por concorrência com PG real

No teste de integração, use banco dedicado e crie o mínimo de admin/Ofício. Não
contate Assinafy. Cubra:

- uma entrega confirma status e exatamente um evento de domínio;
- duas chamadas concorrentes do mesmo ID produzem um `processed` e um
  `duplicate`;
- existe apenas um nonce e um evento correspondente;
- falha transacional determinística não confirma nonce/efeitos e a próxima
  chamada consegue processar;
- evento desconhecido retorna `ignored`.

Para o teste de concorrência, use uma barreira determinística coordenada pelo
PostgreSQL (ex.: `pg_advisory_lock` / `pg_advisory_unlock` ou `NOTIFY`/`LISTEN`
com `pg_sleep`), garantindo que ambas as chamadas do mesmo ID iniciem e se
sobreponham antes de prosseguir. Não dependa exclusivamente de `Promise.all`
sem sincronização — chamadas sequenciais não provam a correção.

Para o teste de falha transacional:
1. provoque uma violação real de constraint criada pelas fixtures;
2. confirme rollback: nenhum nonce, nenhum efeito de domínio;
3. remova da fixture apenas o conflito persistente;
4. execute a segunda chamada — deve processar com sucesso (`processed`);
5. confira ausência de nonce e efeitos da primeira tentativa.

Não adicione branch de teste ao código de produção. O código de produção não
deve conter lógica condicional para viabilizar teste.

**Verificar**: rode o teste focado três vezes; todas passam e não deixam fixtures.

### Etapa 5: Rodar gates oficiais

Rode integração completa e depois a sequência oficial. Revise logs de payload e
mudanças acidentais de schema.

**Verificar**: todos passam e o diff contém apenas arquivos do escopo.

## Plano de testes

- Unit: claim inicial, duplicado, ignorado, falha, auditoria apenas após commit e
  ausência de escritas após duplicado.
- Rota: cada resultado chama o service uma vez; `invalid` retorna 400 terminal;
  nenhuma query de nonce na rota.
- Integração: mesmo ID concorrente confirma um conjunto de efeitos; rollback não
  deixa nonce e permite retry.
- Regressão: secret, timestamp, JSON inválido e GET 405 continuam verdes.

## Critérios de conclusão

- [ ] Não existe check-then-act de nonce na rota.
- [ ] Claim, status, outbox e notificações compartilham uma transação.
- [ ] Só uma chamada concorrente retorna `processed`.
- [ ] Falha não deixa nonce nem efeito de domínio.
- [ ] Evento inválido retorna HTTP 400 terminal, sem retry.
- [ ] No-op intencional é `ignored`, não `failed`.
- [ ] Testes com PG real cobrem concorrência e rollback.
- [ ] Gates oficiais passam na ordem exigida.
- [ ] `advisor-plans/README.md` foi atualizado.

## Condições de STOP

- A constraint única mudou ou não existe.
- A solução exige novo status/coluna.
- Não é possível testar falha sem hook de produção ou rede externa.
- O contrato do provedor exige reprocessar eventos desconhecidos.
- O código divergiu semanticamente de `e0be30d`.

## Notas de manutenção

O nonce é registro durável de propriedade/conclusão, não apenas rate limit.
Nunca o mova para fora da transação de domínio. O teste de concorrência deve
criar sobreposição real; duas chamadas sequenciais não provam a correção. O
Plano 037 deve preservar rollback e retry ao mudar o HTTP.
