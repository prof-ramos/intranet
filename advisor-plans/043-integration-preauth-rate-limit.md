# Plano 043: Separar rate limits pré e pós-autenticação da API de integrações

> **Instruções ao executor**: não exponha chaves em logs/testes. Use somente
> valores sintéticos. Pare se a solução exigir confiar em headers fora da lógica
> existente de proxies.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/integrations/rate-limit.ts src/lib/integrations/rate-limit.test.ts src/lib/integrations/auth.ts src/app/api/v1/events/route.ts src/app/api/v1/events/route.test.ts src/lib/db/schema/rate-limit.ts vercel.json`

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: BAIXO
- **Depende de**: nenhum
- **Categoria**: segurança
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

Qualquer valor enviado em `x-asof-key` cria um bucket próprio antes da
autenticação. Um cliente pode rotacionar valores inválidos para contornar a cota
e aumentar indefinidamente a cardinalidade de `rate_limits`. A defesa deve usar
identidade que o atacante não escolhe antes da autenticação e identidade
canônica da chave depois dela.

## Estado atual

- `rate-limit.ts:127-135` retorna `api-key:<sha256 do header>` para qualquer valor;
  só usa IP quando o header está ausente.
- `events/route.ts:62-76,97-115` consome a cota antes de autorizar.
- `rate-limit.ts:35-70` faz upsert por `(key, scope)`; `cleanup()` existe em
  `:111-113`, mas não há chamador agendado.
- `getClientIp()` delega ao `getTrustedClientIp`, padrão que deve ser preservado.
- Após autenticação, `authorization.principal` distingue sessão e integração e
  fornece ID canônico da chave table-backed.

## Comandos necessários

| Finalidade | Comando                                                                                 | Resultado esperado |
| ---------- | --------------------------------------------------------------------------------------- | ------------------ |
| Limiter    | `npx vitest run src/lib/integrations/rate-limit.test.ts`                                | todos passam       |
| Rota       | `npx vitest run src/app/api/v1/events/route.test.ts`                                    | todos passam       |
| Gates      | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0       |

## Escopo

**Dentro do escopo**:

- `src/lib/integrations/rate-limit.ts`
- `src/lib/integrations/rate-limit.test.ts`
- rotas sob `src/app/api/v1/` que usam `getIntegrationRateLimitKey`
- testes correspondentes
- `vercel.json` ou cron existente somente se necessário para cleanup
- `advisor-plans/README.md`

**Fora do escopo**:

- Rate limiter de login ou Server Actions.
- Alterar formato/armazenamento de chaves ou HMAC.
- Confiar diretamente no primeiro `x-forwarded-for`.
- Plano 044 de limite de corpo.

## Fluxo Git

- Branch: `advisor/043-integration-preauth-rate-limit`
- Commit: `fix(integrations): split preauth and principal rate limits`
- Não publique sem autorização.

## Etapas

### Etapa 1: Definir buckets de duas fases

Substitua o helper ambíguo por APIs explícitas:

- pré-auth: `ip:<trustedClientIp>`, escopo próprio e limite defensivo;
- pós-auth: `session:<userId>`, `api-key:<keyId canônico>` ou identificador
  estável do principal retornado pela autorização.

Nunca use o valor bruto/hash do header inválido como identidade pré-auth.

**Verificar**: teste prova que 100 chaves inválidas rotativas do mesmo IP usam o
mesmo bucket e nenhuma chave aparece em texto.

### Etapa 2: Reordenar as rotas de integração

Em cada rota consumidora, aplique cota pré-auth, autorize, depois aplique a cota
do principal. Preserve resposta 429 e `retryAfterMs`. Sessão admin não deve ser
classificada como API key.

**Verificar**: testes de rota cobrem bloqueio antes da auth, auth inválida e
segundo bloqueio após auth válida.

### Etapa 3: Tornar cleanup executável

Escolha a menor solução compatível com o repositório: cleanup amortizado e
limitado durante consumo ou cron autenticado já existente. Não crie cron público.
Prove que registros expirados são removidos sem afetar buckets ativos.

**Verificar**: teste do store usa relógio injetado e confirma remoção seletiva.

### Etapa 4: Rodar gates

Rode testes focados e sequência oficial. Inspecione o diff por vazamento de valor
de chave e por alteração acidental de scopes.

## Plano de testes

- Rotação de chaves inválidas no mesmo IP compartilha bucket.
- IPs distintos continuam isolados pela extração confiável.
- Chave válida recebe bucket canônico após auth.
- Sessão admin recebe bucket de sessão.
- Cleanup remove apenas expirados.

## Critérios de conclusão

- [ ] Nenhum bucket pré-auth depende de chave fornecida pelo cliente.
- [ ] Rotas aplicam as duas fases na ordem correta.
- [ ] Cleanup possui chamador comprovado.
- [ ] Nenhum segredo aparece em logs, respostas ou snapshots.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- O principal de uma chave válida não possui identificador canônico seguro.
- A plataforma não fornece IP confiável segundo `getTrustedClientIp`.
- Cleanup exige migration destrutiva ou novo serviço externo.
- Outra rota usa o helper antigo com semântica incompatível não coberta no escopo.

## Notas de manutenção

Novos endpoints de integração devem aplicar pré-auth por IP e pós-auth por
principal. Revisores devem rejeitar buckets derivados de credenciais ainda não
validadas.
