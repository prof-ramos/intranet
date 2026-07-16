# Plano 046: Classificar integralmente o CIDR IPv6 link-local dos webhooks

> **Instruções ao executor**: este é um follow-up do Plano 004, cuja checagem
> textual cobriu apenas `fe80`, não todo `fe80::/10`. Não amplie a lista de redes
> bloqueadas sem testes e justificativa.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/integrations/webhooks/validation.ts src/lib/validation/schemas.test.ts`

## Status

- **Prioridade**: P1
- **Esforço**: S
- **Risco**: BAIXO
- **Depende de**: nenhum
- **Categoria**: segurança
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

O comentário afirma bloquear `fe80::/10`, mas `startsWith('fe80')` deixa passar
`fe90`, `fea0` e `febf`, todos link-local. A mesma função classifica endereços
diretos e resultados DNS, portanto a lacuna afeta as duas entradas do SSRF gate.

## Estado atual

- `validation.ts:26-34` contém:

```ts
// fe80::/10 link-local
if (ip.startsWith('fe80')) return true;
```

- `validation.ts:79-82,98-101` reutiliza `isPrivateIPv6` para URL direta e DNS.
- `schemas.test.ts:481-483` testa apenas `fe80::1`.
- O Plano 047 tratará a janela entre resolução e conexão; este plano trata só a
  classificação correta do endereço.

## Comandos necessários

| Finalidade   | Comando                                                                                 | Resultado esperado |
| ------------ | --------------------------------------------------------------------------------------- | ------------------ |
| Teste focado | `npx vitest run src/lib/validation/schemas.test.ts`                                     | todos passam       |
| Gates        | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0       |

## Escopo

**Dentro do escopo**:

- `src/lib/integrations/webhooks/validation.ts`
- `src/lib/validation/schemas.test.ts`
- helper interno novo no mesmo diretório, se necessário
- `advisor-plans/README.md`

**Fora do escopo**:

- Dispatcher/fetch, DNS pinning ou redirects (Plano 047).
- Nova dependência sem aprovação do operador.
- Reclassificar `2001:db8::/32` ou outras faixas não incluídas no finding.

## Fluxo Git

- Branch: `advisor/046-webhook-ipv6-cidr-classification`
- Commit: `fix(webhooks): cover full ipv6 link-local cidr`
- Não publique sem autorização.

## Etapas

### Etapa 1: Substituir prefixo textual por máscara CIDR

Implemente parsing/máscara IPv6 determinístico para testar os 10 bits de
`fe80::/10`. Prefira helper pequeno e testável usando primitives Node/BigInt; não
adicione biblioteca para uma única faixa sem autorização. Preserve ULA, loopback,
NAT64 e IPv4-mapped existentes.

**Verificar**: typecheck passa e não resta `startsWith('fe80')`.

### Etapa 2: Testar limites do CIDR

Adicione casos diretos para início, interior e fim: `fe80::1`, `fe90::1`,
`fea0::1`, `febf:ffff::1` rejeitados; `fec0::1` prova o limite externo segundo a
política atual. Repita ao menos um caso via lookup DNS mockado.

**Verificar**: teste focado passa.

### Etapa 3: Rodar gates

Execute sequência oficial e confirme que nenhum comportamento de fetch mudou.

## Plano de testes

- Limites inferior/interior/superior do `/10`.
- Primeiro endereço fora da faixa.
- URL IPv6 direta e resposta do resolver.
- Regressões para ULA, loopback, mapped IPv4 e IPv6 aceito existente.

## Critérios de conclusão

- [ ] Todo `fe80::/10` é rejeitado.
- [ ] Limite externo tem teste explícito.
- [ ] Não há nova dependência.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- O parser não consegue normalizar formas IPv6 comprimidas com segurança.
- A solução exige biblioteca nova.
- O Plano 047 já substituiu integralmente este helper por classificador testado;
  nesse caso, marque este plano como superseded em vez de duplicar.

## Notas de manutenção

Checks de rede devem operar sobre endereço parseado/máscara, nunca sobre prefixos
textuais. Novas faixas precisam de casos de fronteira.
