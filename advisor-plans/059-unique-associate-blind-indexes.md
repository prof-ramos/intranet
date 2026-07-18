# Plano 059: Garantir unicidade transacional dos blind indexes de identidade

> **Instruções ao executor**: esta mudança inclui migration. Não aplique nada em
> produção antes de concluir o Plano 064. A migration deve falhar fechada se
> encontrar duplicatas; a reconciliação real segue o plano operacional separado.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- src/lib/associates/service.ts src/lib/associates/service.test.ts src/lib/db/schema/associates.ts src/lib/db/schema.integration.test.ts drizzle/postgres`

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: Planos 057 e 064 para limpar resíduos e reconciliar colisões reais
- **Categoria**: bug / migration
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

CPF, SIAPE e e-mail principal criptografados são pesquisados pelos respectivos
blind indexes. O create usa consultas antes do insert e o update não verifica
colisão; sob concorrência, dois oficiais podem compartilhar a mesma identidade.
Somente constraints no PostgreSQL fecham essa corrida.

## Estado atual

- `src/lib/db/schema/associates.ts:127-129` declara índices comuns para
  `cpfHash`, `siapeHash` e `primaryEmailHash`.
- `src/lib/associates/service.ts:686-701` faz check-then-insert sob a transação
  padrão.
- `src/lib/associates/service.ts:465-474` atualiza blind indexes sem precheck.
- Os índices plaintext em `associates.ts:124-126` são únicos, mas novas escritas
  limpam plaintext e não oferecem proteção para ciphertext.
- A próxima migration no baseline é `0032`; `0031_reconcile_snapshot_baseline`
  é a última registrada.

## Comandos necessários

| Finalidade  | Comando                                                                                               | Resultado esperado              |
| ----------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| Unit        | `npx vitest run src/lib/associates/service.test.ts`                                                   | todos passam                    |
| Integração  | `npx vitest run --config vitest.integration.config.ts src/lib/associates/service.integration.test.ts` | todos passam em PostgreSQL real |
| Contrato DB | `npm run test:db`                                                                                     | índices presentes e únicos      |
| Gate        | `npm run validate:full`                                                                               | exit 0                          |

## Escopo

**Dentro do escopo**:

- `src/lib/db/schema/associates.ts`.
- Nova migration `drizzle/postgres/0032_unique_associate_identity_hashes.sql`,
  journal e snapshot gerados pelo tooling.
- `src/lib/db/schema.integration.test.ts`.
- `src/lib/associates/service.ts`, teste unitário e nova integração focada.
- `advisor-plans/README.md`.

**Fora do escopo**:

- Backfill, decrypt ou edição de PII real.
- Unicidade de telefone, RG, WhatsApp ou endereço.
- Remover os prechecks amigáveis existentes.
- Usar `CREATE INDEX CONCURRENTLY`; o runner de migrations é transacional e a
  tabela operacional é pequena.

## Fluxo Git

- Branch: `advisor/059-unique-associate-blind-indexes`.
- Commits: `test(associates): characterize identity collisions` e
  `fix(db): enforce unique associate identity hashes`.
- A execução integral já autoriza publicação e aplicação produtiva depois que o
  Plano 064 reportar zero colisões e todos os gates passarem.

## Etapas

### Etapa 1: Criar testes vermelhos de colisão

No unitário, simule erro PostgreSQL `23505` com cada nome de constraint e exija
`ValidationError` com mensagem amigável, tanto em create quanto update. Na nova
integração, insira fixtures sintéticas concorrentes com o mesmo hash e exija
exatamente um sucesso.

**Verificar**: os novos casos falham contra `14dae8f`; o restante da suíte passa.

### Etapa 2: Alterar o schema Drizzle para índices únicos

Troque apenas os três `index(...)` por `uniqueIndex(...)`, preservando os nomes
`idx_associates_{cpf,siape,primary_email}_hash` para não multiplicar índices.

**Verificar**: `npm run typecheck` sai 0.

### Etapa 3: Criar migration fail-closed

Antes de trocar os índices, faça a migration detectar `GROUP BY hash HAVING
count(*) > 1` para cada coluna não nula e lançar exceção identificável. Depois,
remova os três índices comuns e recrie-os como `UNIQUE`, com os mesmos nomes.
Gere journal/snapshot pelo comando oficial; não edite migrations anteriores.

**Verificar**: banco sintético sem duplicatas migra; fixture temporária duplicada
faz a migration abortar antes de derrubar índices.

### Etapa 4: Traduzir violações de constraint no serviço

Adicione helper fechado que reconheça somente `code === '23505'` e os três nomes
de constraint. Converta-os em `ValidationError`; propague qualquer outro erro.
Mantenha os prechecks do create para UX, mas trate a constraint como autoridade.

**Verificar**: `npx vitest run src/lib/associates/service.test.ts` passa.

### Etapa 5: Fortalecer o contrato de banco

Faça `schema.integration.test.ts` verificar `pg_index.indisunique=true` para os
três nomes, além da presença já coberta. Rode integração e contrato DB.

**Verificar**: `npm run test:db` e o teste de concorrência passam.

### Etapa 6: Rodar gates oficiais

Execute `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:db` e
`npm run build`, nessa ordem, ou `npm run validate:full` quando o ambiente tiver
PostgreSQL dedicado.

## Plano de testes

- Create/update: CPF, SIAPE e e-mail colidentes geram a mensagem correta.
- Duas inserções concorrentes com o mesmo hash: uma confirma, uma recebe 23505.
- Hash nulo continua permitido para múltiplos oficiais.
- Erro 23505 de constraint não relacionada não é mascarado.
- Contrato DB prova presença e unicidade dos três índices.

## Critérios de conclusão

- [ ] Três blind indexes são únicos no schema e no PostgreSQL real.
- [ ] Migration aborta com diagnóstico antes de qualquer DDL se há duplicatas.
- [ ] Create/update convertem somente colisões conhecidas em `ValidationError`.
- [ ] Nulos continuam válidos.
- [ ] Gates oficiais passam.

## Condições de STOP

- Já existe migration 0032 ou os índices mudaram desde `14dae8f`.
- O inventário encontra duplicatas em qualquer ambiente que não seja fixture.
- Drizzle tenta gerar `CONCURRENTLY` ou editar migration aplicada.
- Corrigir dados requer decrypt, exposição ou decisão sobre qual registro vencer.

## Notas de manutenção

Novos identificadores por blind index devem receber constraint de banco e
tradução explícita de 23505; precheck isolado nunca é garantia de unicidade.
