# Plano 038: Auditar apenas mutações confirmadas de associados e Ofícios

> **Instruções ao executor**: siga cada etapa e comando. Em uma condição de
> STOP, pare e reporte; não improvise. Ao final, atualize o status em
> `advisor-plans/README.md`, salvo orientação contrária.
>
> **Verificação de drift (primeiro comando)**:
> `git diff --stat e0be30d..HEAD -- src/lib/associates src/app/app/associados src/lib/oficios src/lib/audit src/lib/db/schema/audit.ts`
> Compare qualquer mudança nas mutações/auditoria com o estado abaixo e pare em
> caso de divergência semântica.

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: segurança
- **Planejado em**: commit `e0be30d`, 2026-07-14

## Por que isso importa

Edições de associado, inclusive PII, e mudanças em dependentes/convênios são
confirmadas sem registro atribuível. No sentido oposto, criação/edição de Ofício
grava auditoria pelo `db` global enquanto a transação ainda executa; uma falha
posterior do outbox pode reverter o Ofício e deixar auditoria órfã. A regra deve
ser: mutação e outbox confirmam juntos; somente depois do commit grava-se
auditoria sanitizada e best-effort.

## Estado atual

- `associates/service.ts:352-382` altera associado e talvez emita
  `associate.updated`, mas não audita.
- `associados/[id]/actions.ts:32-99` chama CRUD de repository diretamente e
  descarta o ator autenticado.
- `associates/profile.ts:60-68` já renderiza `associate_updated`/`data_edit`.
- `oficios/service.ts:40-83` e `94-137` chamam `logAuditAction` dentro da
  transação sem executor; portanto o `db` global pode confirmar antes do outbox.
- `oficios/service.ts:273-294` e `finance/service.ts:359-385` são exemplos
  corretos: retornam `{ result, auditArgs }` da transação e auditam depois.
- `audit/service.ts:29-45` sanitiza PII e normalmente engole falha de insert.
  Services existentes também usam proteção defensiva pós-commit para uma
  rejeição inesperada não alterar o resultado já confirmado.
- O enum possui `associate` e `official_letter`, não entidades de dependente ou
  convênio. Registre filhos contra o associado pai e use somente IDs em metadata;
  não crie migration.

## Vocabulário e privacidade

- Edição: `associate_updated`, entidade `associate`, ID do associado, ator
  autenticado.
- Filhos: `associate_dependent_created|updated|deleted` e
  `associate_health_agreement_created|updated|deleted`, entidade `associate`, ID
  do pai e ID numérico do filho em metadata.
- Ofícios mantêm actions atuais.
- Nunca persista CPF, SIAPE, email, endereço, nome de dependente, plano de saúde,
  ciphertext, hash ou payload do formulário. Para PII, registre apenas o nome
  canônico do campo, como `cpf`, nunca `cpfCiphertext`.

## Comandos necessários

| Finalidade | Comando | Resultado esperado |
| --- | --- | --- |
| Service associados | `npx vitest run src/lib/associates/service.test.ts` | todos passam |
| Actions filhos | `npx vitest run 'src/app/app/associados/[id]/actions.test.ts'` | todos passam |
| Ofícios | `npx vitest run src/lib/oficios/service.test.ts` | todos passam |
| Conjunto focado | `npx vitest run src/lib/associates/service.test.ts 'src/app/app/associados/[id]/actions.test.ts' src/lib/oficios/service.test.ts` | todos passam |
| Gate completo | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0, nessa ordem |

## Escopo

**Dentro do escopo**:

- `src/lib/associates/service.ts`
- `src/lib/associates/service.test.ts`
- `src/app/app/associados/[id]/actions.ts`
- `src/app/app/associados/[id]/actions.test.ts`
- `src/lib/oficios/service.ts`
- `src/lib/oficios/service.test.ts`
- `advisor-plans/README.md` apenas para status

**Fora do escopo**:

- Migration/enum de auditoria.
- Alterar visibilidade ou máscara de PII por role.
- Auditar leitura de perfil.
- Gravar valores antigos/novos de PII.
- Refatorar call sites não relacionados ou o contrato central best-effort.
- Alterar outbox.

## Fluxo Git

- Branch: `advisor/038-consistent-associate-oficio-audit-trail`
- Commit sugerido: `fix(audit): record committed associate and oficio mutations`
- Não faça push nem abra PR sem instrução.

## Etapas

### Etapa 1: Auditar nomes canônicos dos campos alterados

Em `updateAssociateData`, calcule quais campos de negócio realmente mudam
enquanto a linha atual está disponível. Para PII criptografada:

- compare na fronteira normalizada já existente;
- converta patches de três colunas de volta para `cpf`, `rg`, `siape`,
  `primaryEmail`, `phone`, `whatsapp` ou `address`;
- exclua nomes de storage, ator/ID e valores sem mudança;
- grave somente nomes de campos, nunca valores.

Retorne `auditArgs` da transação junto do resultado do outbox. Após commit,
chame `logAuditAction` em proteção best-effort estreita com action
`associate_updated`, ator derivado de `actor.userId` (nunca `input.updatedBy`
controlado pelo cliente) e `metadata.changedFields`. Não audite no-op
comprovado. O outbox continua recebendo apenas
`WEBHOOK_SAFE_ASSOCIATE_FIELDS`.

**Verificar**: testes cobrem campo comum, PII, no-op e falha da auditoria; o
payload contém só nomes canônicos, sem valores/ciphertext/hash.

### Etapa 2: Criar services de mutação de filhos com ator

Mantenha repositories como primitivas. Em `associates/service.ts`, adicione seis
services finos para create/update/delete de dependentes e convênios. Cada um
recebe actor ID, chama o repository e só então grava auditoria best-effort contra
o associado pai. Rejeição inesperada da auditoria não pode transformar uma
mutação já confirmada em falha reportada.

No create, use o ID retornado. Em update/delete, use o ID validado. Metadata pode
conter apenas `{ dependentId }` ou `{ healthAgreementId }`.

Atualize `[id]/actions.ts` para chamar os services e passar `actor.userId`.
Preserve roles, schemas, revalidação e retornos.

**Verificar**: action tests mockam service, não repository, e confirmam actor ID
5. Service tests provam uma auditoria sanitizada por sucesso e nenhuma após
falha do repository.

### Etapa 3: Mover auditoria de Ofícios para depois do commit

Refatore `saveOfficialLetter`, `updateOfficialLetter` e `cancelOfficialLetter`
no padrão de `sendForSignature`:

1. mutação e outbox dentro de `db.transaction`;
2. retorno `{ result, auditArgs }` do callback;
3. `logAuditAction(auditArgs)` em proteção best-effort somente após resolver;
4. mesmo resultado público de antes.

Não passe `executor: tx`. Mantenha action names e dados sanitizados. Remova
comentários que descrevam trade-off órfão já inexistente.

**Verificar**: falha de outbox/repository não chama auditoria; sucesso audita sem
executor e preserva retornos.

### Etapa 4: Adicionar regressões de ordem e privacidade

Prove que auditoria ocorre após a Promise da transação, que falhas não auditam,
que falha de auditoria não altera o resultado confirmado e que payloads de
filhos/PII contêm apenas IDs/nomes de campo. Use Promise controlada ou ordem de
invocação; não use sleeps.

**Verificar**: conjunto focado passa.

### Etapa 5: Rodar gates oficiais

Rode a sequência oficial e procure metadata com PII indevida.

**Verificar**: todos os produtores de auditoria (associados, dependentes,
convênios, Ofícios) devem ter testes que inspecionem estruturalmente
`auditArgs.metadata` e confirmem que contém apenas campos da allowlist canônica
(IDs, action name, actor ID, changedFields com nomes de campo). Testes devem
rejeitar `cpfCiphertext`, `cpfHash`, `siapeCiphertext`,
`primaryEmailCiphertext`, `dependentName`, `provider` ou qualquer forma de
ciphertext/hash em metadata — sem depender de correspondências genéricas como
apenas "cpf". O grep existente permanece como verificação auxiliar.
`rg -n "cpfCiphertext|cpfHash|siapeCiphertext|primaryEmailCiphertext|dependentName|provider" src/lib/associates/service.ts src/app/app/associados/'[id]'/actions.ts`
não encontra novos payloads de auditoria, e todos os gates passam.

## Plano de testes

- Associado: campo seguro, PII, no-op, rollback e falha de auditoria.
- Filhos: seis sucessos e falha representativa; ator e IDs corretos, sem valores
  pessoais.
- Ofícios: create/update/cancel, rollback, falha pós-commit e executor ausente.
- Actions: autorização igual e actor ID encaminhado.

## Critérios de conclusão

- [ ] Toda mutação selecionada tenta auditoria atribuível após sucesso
      (best-effort; falha de auditoria não altera resultado confirmado).
- [ ] Falha/rollback não grava auditoria.
- [ ] Falha de auditoria é observável (log de warning) e possui caminho de
      recuperação (reintentável sem alterar o código de produção).
- [ ] Auditoria de Ofícios ocorre após commit.
- [ ] Payload não contém PII, nomes de dependentes, plano, ciphertext ou hashes.
- [ ] Autorização e outbox permanecem iguais.
- [ ] Testes focados e gates completos passam.
- [ ] `advisor-plans/README.md` foi atualizado.

## Condições de STOP

- Produto exige PII plaintext antiga/nova na auditoria.
- Filhos precisam virar novos tipos do enum, em vez de actions no pai.
- Actor ID não está disponível sem mudar contratos de auth.
- Torna-se necessário alterar outbox.
- Sanitização central foi removida.
- Um gate falha duas vezes após correção razoável.

## Notas de manutenção

Trate payload de auditoria como persistência sensível, mesmo com
`sanitizePiiValue`. Novos campos devem entrar no mapeamento canônico sem expor
colunas de storage. Novos services transacionais devem copiar o padrão de
auditoria pós-commit.
