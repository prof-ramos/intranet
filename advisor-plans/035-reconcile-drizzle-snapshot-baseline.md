# Plano 035: Reconciliar o baseline de snapshots de migrations do Drizzle

> **Instruções ao executor**: siga este plano passo a passo. Rode cada comando
> de verificação e confirme o resultado esperado antes de avançar. Se ocorrer
> uma condição de STOP, pare e reporte; não improvise. Ao terminar, atualize o
> status deste plano em `advisor-plans/README.md`, salvo orientação contrária.
>
> **Verificação de drift (primeiro comando)**:
> `git status --short` (deve estar limpo — staged, unstaged e untracked).
> `git diff e0be30d..HEAD -- drizzle/postgres drizzle.config.ts src/lib/db/schema src/lib/db/schema.integration.test.ts scripts/check-scope.sh`
> Se migrations, journal, snapshots ou schema mudaram, recalcule o próximo
> índice e compare os fatos abaixo com o código atual. Pare se houver divergência
> semântica.

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: ALTO
- **Depende de**: nenhum
- **Categoria**: migration
- **Planejado em**: commit `e0be30d`, 2026-07-14

## Por que isso importa

`drizzle/postgres/meta/_journal.json` registra migrations até 0030, mas o último
snapshot é 0024 e representa o schema anterior às seis migrations seguintes.
Um próximo `drizzle-kit generate` comum comparará o schema TypeScript atual com
esse baseline antigo e poderá gerar SQL para alterações já implantadas. Este
plano cria um baseline atual sem efeito no banco e adiciona uma trava contra
nova divergência entre o journal e seu snapshot mais recente.

## Estado atual

- `_journal.json` termina no índice 30, `0030_add_associate_leave_date`.
- `0024_snapshot.json:5760-5767` ainda define `association_status` como
  `ativo/inativo`.
- `src/lib/db/schema/associates.ts:17` define `associado/nao_associado`.
- `associates.ts:105-108` contém `retirement_date` e `leave_date`, ausentes no
  snapshot 0024.
- `schema.integration.test.ts:237-242` compara nomes dos SQLs com o journal, mas
  não exige snapshot para o último índice.
- `drizzle.config.ts:39-45` usa `src/lib/db/schema/index.ts` e
  `drizzle/postgres`.
- A geração normal (`drizzle-kit generate`) compara o schema TypeScript atual com
  o último snapshot (`0024`) e propõe o SQL correspondente ao drift 0024→schema
  atual. Esse SQL só pode ser neutralizado depois de cada statement ser
  reconciliado com as migrations 0025–0030 já existentes.
- `generate --custom` copia o snapshot anterior e troca somente seus IDs —
  **não** captura alterações TypeScript pós-0024 e portanto não serve para
  estabelecer o baseline correto. A Etapa 2 usa a geração normal, não `--custom`.

## Comandos necessários

| Finalidade | Comando | Resultado esperado |
| --- | --- | --- |
| Confirmar drift | `ls drizzle/postgres/meta/*_snapshot.json | sort | tail -1 && node -e "const j=require('./drizzle/postgres/meta/_journal.json'); console.log(j.entries.at(-1))"` | snapshot 0024 e journal índice 30 antes da mudança |
| Gerar snapshot atual | `npm run db:generate -- --name reconcile_snapshot_baseline` | cria SQL de reconciliação, entrada no journal e snapshot do schema atual |
| Provar baseline limpo | `npm run db:generate -- --name verify_snapshot_baseline` | imprime `No schema changes, nothing to migrate` e não cria arquivos |
| Contrato DB | `npm run test:db` | todos os testes passam |
| Gate completo | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0, nessa ordem |

Rode Drizzle apenas com `DATABASE_MIGRATION_URL` direta de um PostgreSQL local
ou de teste descartável. Nunca use produção, clone com PII ou pooler em modo
transaction.

## Ferramentas sugeridas ao executor

- Consulte o source oficial da tag `drizzle-kit@0.31.10`, especialmente
  `migrationPreparator.ts::preparePgMigrationSnapshot` e
  `cli/commands/migrate.ts::prepareAndMigratePg`, antes de rodar o CLI.
- Use `npm`; não substitua o gerenciador nem o lockfile.

## Escopo

**Dentro do escopo**:

- `drizzle/postgres/0031_reconcile_snapshot_baseline.sql` (gerado; o prefixo só
  muda se outra migration entrar antes)
- `drizzle/postgres/meta/0031_snapshot.json` (gerado)
- `drizzle/postgres/meta/_journal.json` (somente a entrada gerada)
- `src/lib/db/schema.integration.test.ts`
- `scripts/check-scope.sh`
- `advisor-plans/README.md` apenas para status

**Fora do escopo**:

- Alterar schema TypeScript.
- Reescrever migrations 0000-0030 ou fabricar snapshots 0025-0030.
- Aplicar migrations em produção.
- Editar JSON gerado manualmente. Somente o SQL recém-gerado será neutralizado,
  após reconciliação statement a statement.
- Atualizar dependências.

## Fluxo Git

- Branch: `advisor/035-reconcile-drizzle-snapshot-baseline`
- Commit sugerido: `fix(db): reconcile drizzle snapshot baseline`
- Mantenha artefatos gerados e testes de guarda no mesmo commit.
- Não faça push nem abra PR sem instrução do operador.

## Etapas

### Etapa 1: Registrar e inspecionar o baseline antigo

Rode o comando de confirmação, verifique `git status --short` limpo e confirme
que 0031 ainda não existe. Registre a lista de arquivos em `meta/`.

**Verificar**: último `idx` igual a 30 e último snapshot igual a 0024. Caso
contrário, STOP e solicite replanejamento.

### Etapa 2: Gerar o snapshot atual pelo fluxo normal

Rode `npm run db:generate -- --name reconcile_snapshot_baseline`, sem
`--custom`. Se o CLI perguntar sobre renames, responda somente quando a escolha
for comprovada pelo SQL histórico 0025–0030; em qualquer ambiguidade, STOP.

Confirme que o journal ganhou exatamente a entrada 31 e que o snapshot 0031
contém `associado/nao_associado`, `retirement_date` e `leave_date`. Não edite o
snapshot.

**Verificar**: `git diff --stat` lista apenas SQL, snapshot e journal gerados;
nenhum artefato 0000–0030 mudou.

### Etapa 3: Reconciliar cada statement antes de neutralizar o SQL

Compare o SQL gerado, statement a statement, com:

- `0025_officials_domain_statuses.sql`;
- `0026_add_associate_retirement_date.sql`;
- `0027_add_associates_name_translated_trgm_index.sql`;
- `0028_activity_domain_events.sql`;
- `0029_pagination_count_index.sql`;
- `0030_add_associate_leave_date.sql`.

Cada statement gerado deve representar alteração já coberta por uma dessas
migrations. Se houver diferença sem equivalente histórico — tabela, coluna,
enum, index, constraint ou default — STOP: isso é drift de schema real e não
pode ser escondido pelo baseline.

Depois da reconciliação completa, substitua **somente** o conteúdo do SQL 0031
por comentários que expliquem que ele estabelece o baseline e que as mudanças
já foram aplicadas por 0025–0030. Arquivo comment-only é suportado pelo próprio
Drizzle, que gera esse formato para migrations `--custom`. Nunca aplique o SQL
duplicado intermediário em banco algum.

**Verificar**: `rg -v '^\s*(--.*)?$' drizzle/postgres/0031_reconcile_snapshot_baseline.sql`
não produz saída (provando que cada linha não em branco é exclusivamente um comentário `--`); snapshot e journal permanecem intactos.

### Etapa 4: Provar que uma segunda geração não encontra diff

Rode o comando de baseline limpo. Como ausência de mudanças também sai com 0,
verifique tanto a mensagem quanto o filesystem.

**Verificar**: `find drizzle/postgres -maxdepth 1 -name '0032*' -print` e o
equivalente em `meta/` não imprimem nada.

### Etapa 5: Adicionar travas de regressão

Estenda `schema.integration.test.ts` para exigir snapshot com o mesmo índice da
última entrada do journal. Estenda `scripts/check-scope.sh` para rejeitar uma
nova migration/journal staged sem o snapshot do índice mais recente. Não exija
snapshots retroativos para todas as migrations custom históricas; a regra começa
no novo baseline.

**Verificar**: o teste focado de schema passa no DB dedicado e
`bash scripts/check-scope.sh --strict` passa para o conjunto staged esperado.

### Etapa 6: Rodar os gates oficiais

Rode a sequência oficial e revise novamente o SQL vazio e o escopo do diff.

**Verificar**: todos os gates saem 0 e nenhum arquivo de schema TypeScript mudou.

## Plano de testes

- Positivo: último índice do journal possui snapshot e o contrato DB passa.
- Negativo: um último índice sintético sem snapshot falha de modo determinístico.
- CLI: geração comum após o baseline não cria nenhum arquivo.
- Reconciliação: cada statement intermediário possui equivalente nas migrations
  0025–0030 antes de o SQL ser neutralizado.
- Segurança operacional: SQL final não contém DDL/DML executável.

## Critérios de conclusão

- [ ] Migration comment-only 0031 e snapshot do schema atual existem.
- [ ] Todo SQL intermediário foi reconciliado com 0025–0030; nenhuma mudança
      sem migration foi suprimida.
- [ ] O snapshot contém enum e colunas pós-0030.
- [ ] Segunda geração relata ausência de mudanças e não grava arquivos.
- [ ] Último journal sem snapshot é rejeitado pelos gates.
- [ ] Migrations 0000-0030 permanecem byte a byte iguais.
- [ ] Gates oficiais passam na ordem exigida.
- [ ] `advisor-plans/README.md` foi atualizado.

## Condições de STOP

- O CLI exige decisão de rename não comprovável pelas migrations existentes.
- O SQL gerado contém qualquer statement sem equivalente em 0025–0030.
- A geração normal posterior propõe qualquer SQL.
- A solução parece exigir edição manual do snapshot.
- Existe migration posterior à 0030 ao começar.
- O DB descartável diverge de um banco criado do zero pelas migrations.
- Algum comando aponta para produção ou clone com PII.

## Notas de manutenção

O revisor deve analisar tanto o SQL intermediário quanto o SQL final. Atenção:
na versão 0.31.10, `generate --custom` avança journal mas copia o snapshot
anterior; ele não captura alterações TypeScript feitas junto da migration
custom. Toda migration manual que acompanha mudança de schema deve partir de
uma geração normal reconciliada, ou o checklist deve estabelecer explicitamente
um snapshot `cur` antes do próximo `generate`.
