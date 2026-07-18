# Plano 061: Impedir regressões de estado por webhooks Assinafy fora de ordem

> **Instruções ao executor**: não altere autenticação, nonce ou atomicidade já
> corrigidas. Modele a transição antes do handler e trate evento obsoleto como
> `ignored`, mantendo o nonce consumido e sem emitir auditoria, outbox ou
> notificação.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- src/lib/assinafy/service.ts src/lib/assinafy/service.test.ts src/lib/assinafy/service.integration.test.ts src/lib/assinafy/types.ts src/lib/oficios/repository.ts`

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum; os Planos 036/037/045 já estão incorporados
- **Categoria**: bug
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

O handler serializa callbacks e deduplica o mesmo event ID, mas aceita qualquer
status diferente do atual. Um callback atrasado pode regredir um documento
certificado para parcialmente assinado/certificando, alterando a visão legal e
emitindo notificações falsas.

## Estado atual

- `src/lib/assinafy/service.ts:31-40` mapeia eventos para estados.
- `src/lib/assinafy/service.ts:88-116` ignora apenas igualdade e sobrescreve todo
  estado diferente.
- `src/lib/assinafy/service.integration.test.ts:355-386` prova serialização de
  IDs distintos, mas não exige monotonicidade nem estado final.
- O ciclo relevante é `pending_signature → partially_signed → certificating →
certificated`; `certificated`, `expired`, `rejected_by_signer`,
  `rejected_by_user` e `failed` devem ser terminais para callbacks comuns.
- `src/lib/assinafy/types.ts` omite `partially_signed` no enum TypeScript embora
  o enum PostgreSQL o contenha; a política interna deve derivar o tipo do schema
  ou fechar essa divergência explicitamente.

## Comandos necessários

| Finalidade | Comando                                                                                             | Resultado esperado |
| ---------- | --------------------------------------------------------------------------------------------------- | ------------------ |
| Unit       | `npx vitest run src/lib/assinafy/service.test.ts`                                                   | todos passam       |
| Integração | `npx vitest run --config vitest.integration.config.ts src/lib/assinafy/service.integration.test.ts` | todos passam       |
| Gate       | `npm run validate:full`                                                                             | exit 0             |

## Escopo

**Dentro do escopo**:

- `src/lib/assinafy/service.ts` e, se necessário, helper tipado novo no mesmo
  diretório.
- `src/lib/assinafy/service.test.ts` e `service.integration.test.ts`.
- `src/lib/assinafy/types.ts` somente para tipos fechados de estado.
- `advisor-plans/README.md`.

**Fora do escopo**:

- Envio/recovery outbound, lease, autenticação de webhook e TTL de nonce.
- Alterar enums/migration ou semântica do provedor sem contrato confirmado.
- Reprocessar documentos terminais automaticamente.

## Fluxo Git

- Branch: `advisor/061-monotonic-assinafy-transitions`.
- Commits: `test(assinafy): characterize out-of-order callbacks` e
  `fix(assinafy): enforce monotonic webhook transitions`.
- Não publique sem autorização.

## Etapas

### Etapa 1: Escrever uma política fechada de transições

Crie helper puro que classifique `advance`, `same` ou `stale`. Dos estados
iniciais de upload/metadata/pending, permita chegada direta a qualquer destino
mapeado. De `partially_signed`, permita certificating/certificated/falha/rejeição;
de `certificating`, certificated/falha/rejeição. Trate os cinco terminais como
fechados. Origem ou destino desconhecido é `stale` por default. Tipifique o mapa
com a união fechada de status persistidos, não `string` aberto.

**Verificar**: tabela unitária cobre todos os estados de origem e eventos
mapeados; combinações não enumeradas não avançam por default.

### Etapa 2: Adicionar regressões vermelhas no handler

Cubra pelo menos: `certificated` seguido de signer-signed; `certificated` seguido
de document-signed; rejeitado seguido de ready; parcialmente assinado seguido de
ready; mesmo estado repetido com ID distinto.

**Verificar**: casos regressivos falham contra `14dae8f` porque o update é feito.

### Etapa 3: Aplicar a política dentro da transação

Depois do row lock e antes de montar `additionalFields`, retorne `ignored` para
`same` ou `stale`. O claim de nonce deve permanecer na transação; não atualize
timestamp/erro, não emita outbox/notificação e não gere auditoria nesses casos.

**Verificar**: unitários passam e mocks de update/outbox/notificação permanecem
sem chamadas para eventos obsoletos.

### Etapa 4: Provar a ordem em PostgreSQL real

Estenda a integração com sequências invertidas e duas entregas concorrentes de
IDs distintos. Como a ordem do row lock é não determinística, a invariável é:
estado final `certificated`, dois nonces e sequência de domain events igual a
`[certificated]` ou `[partially_signed, certificated]`, nunca inversa. Os
resultados podem ser processed+ignored ou dois processed. Compare status/dedupe
das notificações com os eventos processados, não uma contagem fixa por admin.

**Verificar**: integração passa repetidamente sem depender de qual Promise vence.

### Etapa 5: Rodar gates oficiais

Execute testes focados e sequência lint → typecheck → unit → test:db → build.

## Plano de testes

- Avanços normais e saltos válidos para `certificated`.
- Regressões a partir de cada estado terminal.
- IDs distintos fora de ordem e concorrentes.
- Mesmo estado com novo ID é ignored e nonce fica registrado.
- Evento desconhecido mantém comportamento ignored.

## Critérios de conclusão

- [ ] Nenhum callback comum regride estado terminal ou mais avançado.
- [ ] Eventos obsoletos não geram efeitos secundários.
- [ ] Política é fail-closed para combinações desconhecidas.
- [ ] Testes unitários e PostgreSQL real passam.
- [ ] Gates oficiais passam.

## Condições de STOP

- Documentação/observação real do provedor exigir saída automática de estado
  terminal.
- A política depender de `created_at` do fornecedor sem garantia de ordenação.
- Resolver exigir migration ou reconciliação de documentos reais.

## Notas de manutenção

Novo evento Assinafy deve atualizar simultaneamente mapa, política e tabela de
testes. O revisor deve desconfiar de qualquer fallback “status diferente = update”.
