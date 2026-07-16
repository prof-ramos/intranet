# Plano 048: Fazer o gate de contrato PostgreSQL falhar sem conexão

> **Instruções ao executor**: não enfraqueça o guard de banco dedicado e não use
> produção/PII. O objetivo é tornar `test:db` evidência confiável, não remover o
> skip explícito de `test:integration` quando `.env.test.local` está ausente.
>
> **Verificação de drift**:
> `git diff --stat 45b9ba3..HEAD -- src/lib/db/schema.integration.test.ts scripts package.json vitest.integration.config.ts`

## Status

- **Prioridade**: P1
- **Esforço**: S
- **Risco**: BAIXO
- **Depende de**: nenhum
- **Categoria**: testes
- **Planejado em**: `main` commit `45b9ba3`, 2026-07-16

## Por que isso importa

Com `DATABASE_URL` presente mas inalcançável, o teste captura a falha, avisa e
retorna de quatro casos. `npm run test:db` termina verde sem verificar tabela,
enum, índice ou extensão. Um gate oficial deve falhar fechado; skip local só pode
ser explícito e pertence ao runner de integração, não ao contrato DB.

## Estado atual

- `schema.integration.test.ts:12-26` mantém `connectionFailed` e imprime
  “Skipping DB schema tests”.
- Os casos em `:205-209`, `:227-230`, `:245-248` e `:261-264` retornam sem assert.
- Journal/snapshot em `:273-294` rodam mesmo sem banco, mascarando o skip parcial.
- `package.json:25-26` define `test:db` como gate direto.
- `scripts/run-integration-tests.mjs:11-14` contém o skip explícito permitido para
  a suíte DML; não altere sua semântica neste plano.

## Comandos necessários

| Finalidade          | Comando                                                                                 | Resultado esperado            |
| ------------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| Banco válido        | `npm run test:db`                                                                       | exit 0 e contratos executados |
| Unitários do runner | `npx vitest run scripts/run-integration-tests.test.ts`                                  | todos passam                  |
| Gates               | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0                  |

## Escopo

**Dentro do escopo**:

- `src/lib/db/schema.integration.test.ts`
- teste de processo novo sob `scripts/` se necessário
- `package.json` somente para script auxiliar estritamente necessário
- `advisor-plans/README.md`

**Fora do escopo**:

- Schema, migrations, snapshots ou dados esperados.
- `scripts/run-integration-tests.mjs` e seu skip sem `.env.test.local`.
- Produção ou bancos com PII.

## Fluxo Git

- Branch: `advisor/048-db-contract-fail-closed`
- Commit: `test(db): fail contract gate when postgres is unavailable`
- Não publique sem autorização.

## Etapas

### Etapa 1: Propagar falha de conexão

Remova `connectionFailed` e os retornos silenciosos. No `beforeAll`, encerre o
client best-effort e relance erro sanitizado sem URL/credenciais. Mantenha
`DATABASE_URL` ausente como erro imediato.

**Verificar**: busca por `Skipping DB schema tests` e `connectionFailed` retorna
nenhum resultado.

### Etapa 2: Provar exit code em processo isolado

Adicione teste que execute apenas o contrato com URL sintética inalcançável e
confirme exit não zero. O output pode afirmar “database unavailable”, nunca
imprimir a URL. Isole timeout para o teste não demorar dezenas de segundos.

**Verificar**: teste de processo passa e falharia com a implementação antiga.

### Etapa 3: Provar caminho válido

Com PostgreSQL dedicado/local configurado, rode `npm run test:db` e confirme que
os quatro contratos DB e os contratos de arquivos passam. Não aceite somente os
dois testes de journal/snapshot como sucesso.

**Verificar**: comando sai 0 e lista os casos de tables/columns, enums, indexes e
`pg_trgm` como aprovados.

### Etapa 4: Rodar gates

Execute sequência oficial e confirme diff restrito.

## Plano de testes

- URL ausente → falha.
- URL presente/inválida → exit não zero, sem segredo no output.
- PostgreSQL válido → todos os contratos executam.
- Journal/snapshot continuam independentes, mas não tornam suite verde sem DB.

## Critérios de conclusão

- [ ] Indisponibilidade do banco falha `test:db`.
- [ ] Nenhum skip silencioso permanece no contrato.
- [ ] Banco válido executa todas as asserções.
- [ ] Nenhuma URL/credencial é logada.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- O único banco disponível contém PII/produção.
- A CI depende comprovadamente do skip silencioso.
- O teste de processo não pode limitar timeout sem alterar tooling fora do escopo.

## Notas de manutenção

Ao adicionar novo contrato, mantenha falha de setup como falha da suíte. Mensagens
de diagnóstico devem descrever o tipo de erro, nunca a connection string.
