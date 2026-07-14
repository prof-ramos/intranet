# Plano 015: Criar testes com PostgreSQL real para quatro módulos críticos

> **Instruções ao executor**: siga este plano passo a passo, rodando cada
> verificação. Em uma condição de STOP, pare e reporte; não improvise. Ao final,
> atualize o status em `advisor-plans/README.md`.
>
> **Verificação de drift (primeiro comando)**:
> `git diff --name-only e0be30d..HEAD -- src/lib/finance src/lib/oficios src/lib/activities src/lib/integrations/webhooks vitest.integration.config.ts`
> Valide o escopo: apenas arquivos de teste e configuração esperados mudaram.
> `git diff e0be30d..HEAD -- src/lib/finance src/lib/oficios src/lib/activities src/lib/integrations/webhooks vitest.integration.config.ts`
> Compare mudanças semânticas com o estado abaixo e pare se houver divergência.

## Status

- **Prioridade**: P3
- **Esforço**: L
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: testes
- **Planejado em**: commit `e0be30d`, 2026-07-14
- **Issue**: [#253](https://github.com/prof-ramos/intranet/issues/253)

## Por que isso importa

Os quatro `*.integration.test.ts` listados conectam ao PostgreSQL e montam
fixtures, mas sua única asserção importa o módulo. Não exercitam commit/rollback,
atomicidade do outbox, constraints nem concorrência otimista. Assim, o
comportamento de persistência de maior risco permanece coberto apenas por mocks
de Drizzle.

A fatia Assinafy que existia neste plano foi movida para o Plano 036 por ser
pré-requisito P1 da correção atômica. Não adicione Assinafy aqui.

## Estado atual

- `finance/service.integration.test.ts:25-28` apenas importa `./service`.
- `oficios/service.integration.test.ts:19-22` apenas importa `./service`.
- `activities/service.integration.test.ts:19-22` apenas importa `./service`.
- `integrations/webhooks/service.integration.test.ts:19-22` apenas importa o
  módulo.
- `juridico/service.integration.test.ts` é o exemplo estrutural: IDs únicos,
  banco dedicado e limpeza em ordem segura para FKs.
- `npm run test:integration` usa `scripts/guard-integration-db.js` e faz skip sem
  `.env.test.local`. Nunca enfraqueça esse guard.
- Outbox deve escrever na mesma transação da mutação. Auditoria ocorre
  best-effort após commit, pelo `db` padrão.

## Comandos necessários

| Finalidade | Comando | Resultado esperado |
| --- | --- | --- |
| Financeiro | `node scripts/guard-integration-db.js && npx vitest run --config vitest.integration.config.ts src/lib/finance/service.integration.test.ts` | todos passam |
| Ofícios | `node scripts/guard-integration-db.js && npx vitest run --config vitest.integration.config.ts src/lib/oficios/service.integration.test.ts` | todos passam |
| Atividades | `node scripts/guard-integration-db.js && npx vitest run --config vitest.integration.config.ts src/lib/activities/service.integration.test.ts` | todos passam |
| Webhooks | `node scripts/guard-integration-db.js && npx vitest run --config vitest.integration.config.ts src/lib/integrations/webhooks/service.integration.test.ts` | todos passam |
| Integração completa | `npm run test:integration` | passa ou skip documentado sem env de teste |
| Gate completo | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0, nessa ordem |

## Escopo

**Dentro do escopo**:

- `src/lib/finance/service.integration.test.ts`
- `src/lib/oficios/service.integration.test.ts`
- `src/lib/activities/service.integration.test.ts`
- `src/lib/integrations/webhooks/service.integration.test.ts`
- `advisor-plans/README.md` apenas para status

**Fora do escopo**:

- `src/lib/assinafy/**` e sua rota; pertencem ao Plano 036.
- Alterações em services/repositories de produção.
- `vitest.integration.config.ts` ou enfraquecimento do guard de banco.
- Rede externa; substitua entrega HTTP por stub local determinístico.

## Fluxo Git

- Branch: `advisor/015-integration-tests-modules`
- Commit sugerido: `test(integration): cover transactional module invariants`
- Não faça push nem abra PR sem instrução.

## Etapas

### Etapa 1: Substituir o teste vazio do Financeiro

Cubra transição que confirma `monthly_payments` e o evento
`monthly_payment.updated`. Force falha após mutação e antes do commit, provando
rollback de ambos. Cubra concorrência com `updated_at` real.

**Verificar**: comando focado passa e não deixa fixtures.

### Etapa 2: Substituir o teste vazio de Ofícios

Cubra criação e outbox para status operacional, rollback quando o outbox falha e
a constraint `(year, sequence)`. Não chame Assinafy.

**Verificar**: comando focado passa.

### Etapa 3: Substituir o teste vazio de Atividades

Cubra create + `activity.created`, primeira conclusão +
`activity.status_changed`/`activity.completed` e rollback de mutação/eventos.

**Verificar**: comando focado passa.

### Etapa 4: Substituir o teste vazio do dispatcher genérico

Crie subscription e domain event locais. Mocke somente `fetch`; deixe todas as
escritas PostgreSQL reais. Prove entrega, retry após falha determinística e
status final do evento. Não use URL externa.

**Verificar**: comando focado passa.

### Etapa 5: Rodar os gates

Rode integração completa e a sequência oficial.

**Verificar**: `git diff --name-only` deve corresponder exatamente à allowlist:
`src/lib/finance/service.integration.test.ts`,
`src/lib/oficios/service.integration.test.ts`,
`src/lib/activities/service.integration.test.ts`,
`src/lib/integrations/webhooks/service.integration.test.ts`,
e `advisor-plans/README.md`. O gate deve falhar se qualquer arquivo adicional
(configuração, guard, scripts ou testes fora do escopo) for alterado. Nenhuma
fonte de produção deve estar no diff.

## Plano de testes

- Cada arquivo deve verificar estado no DB, não somente retorno da função.
- Use IDs únicos e limpeza explícita em ordem inversa de FKs.
- Inclua ao menos um commit e um rollback por módulo transacional.
- Não faça pass silencioso sem DB; somente o skip do script é permitido.

## Critérios de conclusão

- [ ] Os quatro arquivos possuem asserções reais de banco.
- [ ] Não resta `service module loads correctly` neles.
- [ ] Todos os comandos focados passam.
- [ ] Gates oficiais passam na ordem exigida.
- [ ] Nenhuma fonte de produção mudou.
- [ ] `advisor-plans/README.md` foi atualizado.

## Condições de STOP

- Um teste exige produção ou banco com PII.
- O guard permite `asof_intranet` ou banco não dedicado.
- Cobertura exige alteração de fonte de produção.
- Dependência externa não pode ser substituída por stub determinístico.
- Um comando falha duas vezes após correção somente de teste.

## Notas de manutenção

Mantenha os testes focados em semântica PostgreSQL que mocks não provam. Não os
expanda para comportamento unitário já coberto. Revise a limpeza: fixtures
vazadas tornam a suíte dependente de ordem.
