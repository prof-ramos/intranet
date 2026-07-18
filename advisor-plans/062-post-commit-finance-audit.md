# Plano 062: Registrar auditoria financeira somente após commit confirmado

> **Instruções ao executor**: copie o padrão de `cancelMonthlyPayment`, que
> retorna `auditArgs` da transação e chama auditoria depois do commit. O outbox
> continua dentro da transação; não mova dispatch HTTP para dentro dela.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- src/lib/finance/service.ts src/lib/finance/service.test.ts src/lib/finance/service.integration.test.ts src/lib/audit/service.ts`

## Status

- **Prioridade**: P1
- **Esforço**: S
- **Risco**: BAIXO
- **Depende de**: nenhum
- **Categoria**: bug
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

`updateMonthlyPayment` grava auditoria por uma conexão independente antes de
inserir o evento outbox e confirmar a transação. Se outbox/commit falhar, a
mensalidade volta ao estado anterior, mas o log pode afirmar que a alteração
ocorreu, quebrando a trilha financeira.

## Estado atual

- `src/lib/finance/service.ts:166-283` envolve mutação e outbox em transação.
- `src/lib/finance/service.ts:235-256` chama `logAuditAction` sem executor antes
  de `emitDomainEvent(..., tx)`.
- `src/lib/audit/service.ts:29` usa `db` quando não recebe executor e trata falha
  como best-effort.
- `src/lib/finance/service.ts:295` em diante já retorna `auditArgs` no cancelamento
  e registra depois do commit; este é o padrão canônico.

## Comandos necessários

| Finalidade | Comando                                                                                            | Resultado esperado |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------ |
| Unit       | `npx vitest run src/lib/finance/service.test.ts`                                                   | todos passam       |
| Integração | `npx vitest run --config vitest.integration.config.ts src/lib/finance/service.integration.test.ts` | todos passam       |
| Gate       | `npm run validate:quick`                                                                           | exit 0             |

## Escopo

**Dentro do escopo**:

- `src/lib/finance/service.ts`, `service.test.ts` e
  `service.integration.test.ts`.
- `advisor-plans/README.md`.

**Fora do escopo**:

- Alterar schema, estados financeiros, outbox ou cancelamento.
- Tornar auditoria obrigatória/atômica; ADR/padrão atual é best-effort pós-commit.
- Corrigir o mapeamento de erro da action de cancelamento, que é finding separado.

## Fluxo Git

- Branch: `advisor/062-post-commit-finance-audit`.
- Commit: `fix(finance): audit monthly payments after commit`.
- A execução integral já autoriza publicação, promoção, merge e limpeza da branch
  depois dos gates e da revisão Standards/Spec.

## Etapas

### Etapa 1: Criar teste vermelho de falha do outbox

No teste unitário, faça `emitDomainEvent` rejeitar após o upsert e exija que
`updateMonthlyPayment` rejeite sem chamar `logAuditAction`. Adicione mock dedicado
de transação que marque antes/depois da callback awaited e prove a ordem exata
`[outbox, commit, audit]`; o mock padrão não representa commit. Use
`mockImplementationOnce` para não contaminar os demais testes.

**Verificar**: o teste de falha quebra contra `14dae8f` porque auditoria já foi
chamada.

### Etapa 2: Retornar argumentos da transação

Faça a callback retornar `{ result, auditArgs }`. Mantenha upsert, validação de
concorrência e `emitDomainEvent(..., tx)` intactos. Depois que `db.transaction`
resolver, chame `logAuditAction(auditArgs)` e retorne `result`. Capture uma
rejeição inesperada do logger best-effort, registre-a sanitizada e preserve o
resultado já confirmado; o serviço real normalmente absorve falhas de insert.

**Verificar**: `npx vitest run src/lib/finance/service.test.ts` passa.

### Etapa 3: Fortalecer a integração existente

No sucesso, consulte `audit_logs` e exija exatamente action, performedBy,
old/new status e metadata sem PII. No conflito stale, exija ausência de auditoria.
Preserve cleanup por IDs. O rollback manual atual cobre pagamento+outbox; a
ausência de auditoria falsa deve ser atribuída ao unitário com falha injetada.

**Verificar**: integração passa contra PostgreSQL dedicado.

### Etapa 4: Rodar gates

Execute testes focados, integração PostgreSQL e os gates oficiais na ordem
documentada: lint, typecheck, unitários, contrato DB e build. Finalize com
`npm run pr:check`.

## Plano de testes

- Sucesso: mutação, outbox e auditoria existem.
- Falha de outbox: auditoria não é chamada.
- Conflito otimista: auditoria não é chamada.
- Auditoria best-effort falha depois do commit sem reverter a mensalidade.
- Payload auditado não contém PII.

## Critérios de conclusão

- [ ] Nenhum `logAuditAction` ocorre dentro da transação de update.
- [ ] Outbox continua atômico com a mensalidade.
- [ ] Falhas antes do commit não deixam auditoria falsa.
- [ ] Testes focados, integração, sequência oficial e `npm run pr:check` passam.

## Condições de STOP

- O refactor exigir mudar a política global de auditoria.
- `emitDomainEvent` não estiver mais dentro da mesma transação.
- Teste revelar consumidor que exige auditoria antes do commit.

## Notas de manutenção

Para serviços financeiros, efeitos duráveis obrigatórios pertencem à transação;
auditoria best-effort só pode descrever mutações já confirmadas.
