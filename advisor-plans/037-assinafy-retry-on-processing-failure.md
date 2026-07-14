# Plano 037: Retornar falha HTTP recuperável após rollback Assinafy

> **Instruções ao executor**: execute somente depois que o Plano 036 estiver
> DONE. Siga todas as etapas e verificações. Em uma condição de STOP, pare e
> reporte. Ao terminar, atualize `advisor-plans/README.md`.
>
> **Verificação de drift (primeiro comando)**:
> `git diff --stat e0be30d..HEAD -- src/lib/assinafy/service.ts src/lib/assinafy/service.test.ts src/app/api/webhooks/assinafy/route.ts src/app/api/webhooks/assinafy/route.test.ts`
> Mudanças do Plano 036 são esperadas. Confirme que o contrato pré-requisito
> abaixo existe; caso contrário, STOP.

## Status

- **Prioridade**: P1
- **Esforço**: S
- **Risco**: BAIXO
- **Depende de**: Plano 036
- **Categoria**: bug
- **Planejado em**: commit `e0be30d`, 2026-07-14

## Por que isso importa

No commit planejado, falha da transação Assinafy é capturada e convertida em
`null`; a rota entende o valor resolvido como sucesso, grava nonce e responde
200. O provedor não recebe sinal para repetir um evento que não confirmou seus
efeitos. O Plano 036 remove a perda do nonce e cria resultado `failed`; este
plano mapeia esse estado para HTTP 500, preservando sucesso para duplicados e
no-ops intencionais.

## Estado atual e pré-requisito

Em `e0be30d`:

```ts
// src/lib/assinafy/service.ts:152-158
} catch (error) {
  logger.error('Failed to update assinafy status', ...);
  return null;
}
```

```ts
// src/app/api/webhooks/assinafy/route.ts:82-98
await handleWebhookEvent(event);
// insert do nonce
return NextResponse.json({ received: true });
```

Após o Plano 036, o service deve retornar
`processed | duplicate | ignored | failed`, e `failed` deve significar rollback
do nonce — representa exclusivamente falhas recuperáveis com nonce revertido.
A rota não pode mais persistir nonce.

Se o Plano 036 também retornar `failed` para falhas não recuperáveis (ex.:
event.id inválido, evento malformado sem possibilidade de retry), introduza uma
distinção entre `failed` (recuperável, HTTP 500) e um resultado terminal (ex.:
`rejected` ou `invalid`) que retorne HTTP 200 ou 400 — evitando que a rota
converta toda falha em retry infinito. Defina testes para ambos os casos.

Este plano é inválido enquanto essas condições não forem verdadeiras.

## Comandos necessários

| Finalidade | Comando | Resultado esperado |
| --- | --- | --- |
| Unit rota | `npx vitest run src/app/api/webhooks/assinafy/route.test.ts` | todos passam |
| Unit service | `npx vitest run src/lib/assinafy/service.test.ts` | todos passam |
| Integração | `npx vitest run --config vitest.integration.config.ts src/lib/assinafy/service.integration.test.ts` | rollback/retry passam |
| Gate completo | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0, nessa ordem |

## Escopo

**Dentro do escopo**:

- `src/app/api/webhooks/assinafy/route.ts`
- `src/app/api/webhooks/assinafy/route.test.ts`
- `src/lib/assinafy/service.test.ts` apenas se necessário ao contrato
- `src/lib/assinafy/service.integration.test.ts` apenas para provar retry
- `advisor-plans/README.md` apenas para status

**Fora do escopo**:

- Refazer atomicidade do nonce; pertence ao Plano 036.
- Alterar secret, timestamp ou schema do request.
- Mudar a resposta de sucesso de `processed`, `duplicate` ou `ignored`.
- Expor exceções ao cliente.
- Chamar SDK/API do provedor.

## Fluxo Git

- Branch: `advisor/037-assinafy-retry-on-processing-failure`
- Commit sugerido: `fix(assinafy): signal retry after webhook rollback`
- Não faça push nem abra PR sem instrução.

## Etapas

### Etapa 1: Mapear falha explícita para HTTP 500

Capture o resultado de `handleWebhookEvent(event)`. Para
`result.kind === 'failed'`, registre apenas o tipo do evento (`event.type`) —
nunca `event.id`, document ID, userId ou qualquer identificador potencialmente
correlacionável. Use exclusivamente um identificador interno opaco do log
(ex.: UUID da execução) se necessário para correlação; nunca um hash simples de
dados sensíveis. Devolva o corpo genérico existente
`{ error: 'Internal server error' }` com status 500. Não registre payload,
exceção, PII nem mensagem interna na rota.

Retorne 200 `{ received: true }` para `processed`, `duplicate` e `ignored`.
Mantenha o `catch` defensivo da rota para rejeições inesperadas.

**Verificar**: testes da rota cobrem status exato dos quatro estados e de uma
rejeição inesperada. Testes adicionais confirmam que payload, exceção, event.id
e dados sensíveis não chegam ao logger no caso `failed`.

### Etapa 2: Corrigir o teste mockado enganoso

O teste atual só prova 500 quando o mock rejeita, embora o service real resolva
`null`. Substitua a lacuna por:

- `{ kind: 'failed' }` resolvido → 500;
- Promise rejeitada → 500 defensivo.

Confirme que a resposta genérica não contém erro do DB e os demais estados
continuam 200.

**Verificar**: teste focado passa e os nomes descrevem o contrato real.

### Etapa 3: Provar que a falha continua repetível

Use a fixture de integração do Plano 036. Force uma falha transacional e prove:

1. resultado `failed`;
2. nenhum nonce confirmado;
3. o mesmo ID funciona na chamada seguinte;
4. existe exatamente um conjunto final de efeitos.

Faça no nível do service; não crie servidor HTTP para esse teste.

**Verificar**: teste de integração passa repetidamente.

### Etapa 4: Rodar gates oficiais

Rode a sequência oficial e revise o diff contra vazamento de erro interno.

**Verificar**: todos passam e nenhum arquivo fora do escopo mudou.

## Plano de testes

- `processed`, `duplicate` e `ignored` → 200.
- `failed` resolvido → 500 genérico.
- rejeição inesperada → 500 genérico.
- falha real → sem nonce; mesmo evento processa uma vez posteriormente.

## Critérios de conclusão

- [ ] Falha real do service produz HTTP 500.
- [ ] Duplicado e no-op continuam HTTP 200.
- [ ] Tentativa falha não confirma nonce.
- [ ] Resposta/log não expõe exceção nem payload.
- [ ] Regressões de rota e integração passam.
- [ ] Gates oficiais passam na ordem exigida.
- [ ] `advisor-plans/README.md` foi atualizado.

## Condições de STOP

- Plano 036 não está DONE ou não possui contrato com quatro estados.
- `failed` pode coexistir com nonce confirmado.
- Contrato verificado do provedor exige status de retry diferente de 5xx.
- O mapeamento exige alterar autenticação/validação.
- Um gate falha duas vezes após correção razoável.

## Notas de manutenção

O resultado de transporte deve refletir a transação: duplicado/no-op confirmado
é sucesso; processamento revertido é falha recuperável. Se outro provedor tiver
política diferente, use adaptador específico e preserve o contrato explícito do
service.
