# Plano 051: Serializar a sequência anual de Ofícios no PostgreSQL

> **Instruções ao executor**: prove concorrência em PostgreSQL real e não remova
> as constraints existentes. Não use lock em processo/memória, pois Vercel possui
> múltiplas instâncias.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- src/lib/oficios/service.ts src/lib/oficios/service.test.ts src/lib/oficios/repository.ts src/lib/oficios/repository.test.ts src/lib/oficios/service.integration.test.ts src/lib/db/schema/oficios.ts`

## Status

- **Prioridade**: P2
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum; execute preferencialmente após o Plano 048
- **Categoria**: bug
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

Duas transações podem ler a mesma maior sequência e tentar inserir o mesmo
`(year, sequence)`. A unique constraint preserva integridade, mas converte a
corrida em falha visível para um operador legítimo. A alocação precisa ser
serializada por ano dentro da mesma transação que insere Ofício e outbox.

## Estado atual

- `repository.ts:48-56` consulta maior `sequence` sem lock.
- `service.ts:54-67` faz `max + 1` e insert na mesma transação padrão.
- `schema/oficios.ts:80-89` possui `uq_oficios_year_sequence` e checks; preserve-os.
- `service.integration.test.ts:19-22` apenas importa o módulo.
- Exemplo de retry de unique no domínio: `juridico/service.ts:16,49-55`, mas um
  advisory transaction lock por ano evita retry e mantém a transação única.

## Comandos necessários

| Finalidade | Comando                                                                                 | Resultado esperado                     |
| ---------- | --------------------------------------------------------------------------------------- | -------------------------------------- |
| Unitário   | `npx vitest run src/lib/oficios/service.test.ts src/lib/oficios/repository.test.ts`     | todos passam                           |
| Integração | `node scripts/run-integration-tests.mjs`                                                | teste concorrente passa no DB dedicado |
| Gates      | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0                           |

## Escopo

**Dentro do escopo**:

- `src/lib/oficios/service.ts` e teste
- `src/lib/oficios/repository.ts` e teste
- `src/lib/oficios/service.integration.test.ts`
- `advisor-plans/README.md`

**Fora do escopo**:

- Alterar formato `OFÍCIO Nº NNN/YYYY/ASOF`.
- Migration, sequence global ou renumeração histórica.
- Assinafy, PDFs ou status de Ofício.
- Ano/calendário institucional, tratado no Plano 052.

## Fluxo Git

- Branch: `advisor/051-oficio-year-sequence-lock`
- Commit: `fix(oficios): serialize annual sequence allocation`
- Não publique sem autorização.

## Etapas

### Etapa 1: Adquirir advisory transaction lock por ano

Antes de consultar a maior sequência, execute no mesmo `tx` um
`pg_advisory_xact_lock(namespace, year)`, com namespace inteiro fixo documentado.
Use a variante de dois inteiros para isolar Ofícios e ano sem hash textual.
Mantenha o lock somente durante a transação; não use session lock.

**Verificar**: unit test prova que lock ocorre antes de `getLastSequenceForYear`
e insert, usando o mesmo executor.

### Etapa 2: Manter alocação e outbox atômicos

Após o lock, calcule `max + 1`, insira Ofício e emita `official_letter.created`
como hoje. Não mova audit best-effort para dentro da transação e não remova a
constraint de segurança.

**Verificar**: testes atuais de criação/outbox continuam passando.

### Etapa 3: Adicionar teste concorrente real

No banco dedicado, crie admin/fixtures sintéticos e dispare duas chamadas de
save para o mesmo ano com barreira para sobreposição. Confirme ambas bem-sucedidas,
sequências consecutivas distintas e dois números únicos. Limpe outbox/ofícios/admin
em ordem de FK.

**Verificar**: integração passa repetidamente e não deixa fixtures.

### Etapa 4: Rodar gates

Execute sequência oficial. Confirme que nenhuma migration foi criada.

## Plano de testes

- Lock precede leitura/inserção.
- Duas criações concorrentes resultam em N e N+1, sem erro.
- Falha dentro da transação libera lock e faz rollback de Ofício/outbox.
- Anos diferentes não compartilham a mesma chave lógica.

## Critérios de conclusão

- [ ] Alocação é serializada no PostgreSQL por ano.
- [ ] Duas criações concorrentes têm sucesso e números distintos.
- [ ] Constraint e outbox atômico permanecem.
- [ ] Gates passam; índice atualizado.

## Condições de STOP

- O ambiente de integração não é PostgreSQL dedicado/sintético.
- Outra rotina aloca sequência fora de `saveOfficialLetter`.
- O lock escolhido colide com namespace documentado de outro módulo.
- A solução exige migration/counter table; reporte antes de criar.

## Notas de manutenção

Qualquer novo caminho de criação de Ofício deve passar pela mesma transação e
chave de advisory lock. O teste concorrente é a prova principal; mocks não validam
serialização PostgreSQL.
