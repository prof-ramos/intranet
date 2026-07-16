# Plano 044: Limitar e reutilizar o corpo assinado da API de integrações

> **Instruções ao executor**: preserve byte a byte a entrada usada no HMAC. Não
> converta falha de leitura em corpo vazio. Este plano continua o Plano 028,
> cuja proteção por `Content-Length` foi insuficiente.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/integrations/verify-request.ts src/lib/integrations/verify-request.test.ts src/lib/integrations/auth.ts src/lib/integrations/webhook-handler.ts src/app/api/v1/events/route.ts src/app/api/v1/events/route.test.ts`
> Pare se o Plano 043 ainda não estiver aplicado ou se a autenticação não usar o
> mesmo corpo que será parseado.

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: Plano 043
- **Categoria**: segurança
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

O limite atual confia em `Content-Length`; quando ausente ou falso,
`request.clone().text()` materializa o corpo inteiro antes de validar a chave.
Depois, a rota lê o request original outra vez. Isso permite pressão de memória
pré-auth e cria risco de verificar bytes diferentes dos efetivamente parseados.

## Estado atual

- `verify-request.ts:43-56`: `MAX_BODY_BYTES` existe, mas só rejeita tamanho
  declarado; erros retornam `{ ok: true, body: '' }`.
- `verify-request.ts:168-184`: o corpo é lido antes da validação completa e entra
  no payload HMAC.
- `events/route.ts:119-130`: o parse chama `request.text()` novamente.
- `verify-request.test.ts:455-485`: cobre apenas `Content-Length > 10 MiB`.
- `webhook-handler.ts:17-51` separa authenticate/parse e atualmente só passa o
  contexto auth, não os bytes autenticados.

## Comandos necessários

| Finalidade   | Comando                                                                                           | Resultado esperado |
| ------------ | ------------------------------------------------------------------------------------------------- | ------------------ |
| Auth         | `npx vitest run src/lib/integrations/verify-request.test.ts`                                      | todos passam       |
| Handler/rota | `npx vitest run src/lib/integrations/webhook-handler.test.ts src/app/api/v1/events/route.test.ts` | todos passam       |
| Gates        | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build`           | todos saem 0       |

## Escopo

**Dentro do escopo**:

- `src/lib/integrations/verify-request.ts` e teste
- `src/lib/integrations/auth.ts`, se necessário para propagar corpo autenticado
- `src/lib/integrations/webhook-handler.ts` e teste
- rotas de integração que verificam HMAC e depois parseiam JSON
- `advisor-plans/README.md`

**Fora do escopo**:

- Alterar algoritmo, headers ou formato de assinatura.
- Aplicar limite genérico a uploads/rotas não assinadas.
- Aumentar o limite de 10 MiB sem decisão explícita.
- Buffering em disco ou serviço externo.

## Fluxo Git

- Branch: `advisor/044-integration-streaming-body-limit`
- Commit: `fix(integrations): bound and reuse signed request bodies`
- Não publique sem autorização.

## Etapas

### Etapa 1: Implementar leitor limitado de stream

Leia `request.body` por chunks, mantenha contagem de bytes e cancele o reader ao
ultrapassar `MAX_BODY_BYTES`. `Content-Length` permanece fast-fail, nunca fonte
de verdade. Decodifique uma única vez com `TextDecoder` preservando o conteúdo
usado na assinatura. Falha/cancelamento retorna erro explícito, nunca string vazia.

**Verificar**: novos testes rejeitam stream chunked de `limit+1`, aceitam limite
exato e distinguem falha de leitura de corpo vazio válido.

### Etapa 2: Propagar o corpo autenticado

Inclua o corpo verificado no contexto interno de autorização/handler sem expô-lo
na resposta nem no `RequestPrincipal`. O parse JSON deve consumir essa string ou
bytes, não chamar `request.text()`/`json()` novamente.

**Verificar**: spy de stream/leitor prova uma única leitura na rota POST.

### Etapa 3: Preservar assinatura e erros HTTP

Confirme que HMAC é calculado sobre exatamente o corpo reaproveitado. Mapeie
oversize para `body_too_large`; falha de stream para erro genérico seguro 400.
Não inclua corpo ou exceção bruta em logs.

**Verificar**: assinatura válida/ inválida e JSON inválido mantêm códigos
esperados; corpo vazio válido continua funcionando.

### Etapa 4: Rodar gates

Execute os testes focados e a sequência oficial. Faça busca final por segunda
leitura nas rotas HMAC alteradas.

## Plano de testes

- `Content-Length` acima do limite: rejeição antes de ler.
- Sem header: limite exato aceito; `+1` rejeitado durante stream.
- Chunks multibyte não quebram contagem/decodificação.
- Falha do reader não autentica como corpo vazio.
- HMAC e parse usam o mesmo conteúdo e o stream é lido uma vez.

## Critérios de conclusão

- [ ] Limite independe de `Content-Length` confiável.
- [ ] Corpo assinado é lido no máximo uma vez e reutilizado no parse.
- [ ] Falha de leitura falha fechado e sem vazamento.
- [ ] Testes de fronteira passam.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- O runtime não expõe `ReadableStream` compatível com cancelamento nos testes.
- Propagar bytes exige tornar o corpo parte pública do principal/auth result.
- Uma rota precisa de streaming legítimo acima de 10 MiB.
- O Plano 043 não foi aplicado e requests inválidos continuam sem cota por IP.

## Notas de manutenção

Qualquer novo endpoint HMAC deve verificar e parsear a mesma representação.
Revisores devem procurar `request.clone().text()`, `request.text()` ou
`request.json()` duplicados após a autenticação.
