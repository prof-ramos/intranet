# Plano 064: Reconciliar identidades duplicadas sem expor PII

> **Instruções ao executor**: implemente primeiro um relatório determinístico e
> fail-closed. O modo de aplicação deve exigir o hash desse relatório, adquirir
> advisory lock e executar toda a reconciliação em uma única transação. Nunca
> imprima CPF, SIAPE, e-mail, hashes, ciphertext ou payload de origem.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- package.json scripts src/lib/db/schema src/lib/associates docs/operations`

## Status

- **Prioridade**: P1
- **Esforço**: L
- **Risco**: ALTO
- **Depende de**: Plano 057
- **Bloqueia**: Plano 059
- **Categoria**: dados / operação / LGPD
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

O inventário produtivo encontrou grupos repetidos nos blind indexes de CPF,
SIAPE e e-mail principal. A migration de unicidade do Plano 059 deve abortar
enquanto essas colisões existirem. Uma correção manual ad hoc pode misturar
pessoas diferentes, perder mensalidades ou vazar PII em logs.

## Interface do módulo

Criar um comando administrativo com duas operações:

- `npm run db:reconcile-associate-identities -- --mode report` gera JSON
  determinístico somente com IDs técnicos, contagens, elegibilidade, códigos de
  conflito e `evidenceHash` SHA-256.
- `npm run db:reconcile-associate-identities -- --mode apply --evidence-hash <sha256>`
  recalcula o relatório dentro da transação e só aplica quando o hash coincide e
  todos os componentes são elegíveis.

O comando `report` é o default. `apply` sem hash, com hash divergente ou com um
único componente ambíguo termina diferente de zero e não altera nenhuma tabela.

## Escopo

**Dentro do escopo**:

- `scripts/reconcile-associate-identities.ts` e testes.
- Script npm administrativo.
- FKs de `activities`, `monthly_payments`, `legal_consultations`,
  `legal_processes`, `dependents` e `health_agreements`.
- Registro de auditoria agregado da reconciliação.
- Evidência operacional sem PII em `docs/operations/archive/`.

**Fora do escopo**:

- Decrypt, exportação ou impressão de PII.
- Resolver automaticamente nomes, identificadores ou mensalidades conflitantes.
- Reescrever eventos de domínio ou auditorias históricas já emitidas.
- Alterar status funcionais ou associativos por preferência heurística.

## Regras determinísticas

1. Construa componentes conectados quando duas linhas compartilham qualquer
   hash não nulo entre CPF, SIAPE e e-mail principal.
2. Um componente é elegível somente quando:
   - todos os nomes normalizados são iguais;
   - há no máximo um valor não nulo distinto para cada hash de identidade;
   - campos não nulos do cadastro não divergem, ignorando IDs, timestamps,
     `sourceRowNumber`, `sourcePayload` e os caches derivados;
   - não há duas mensalidades para o mesmo ano/mês;
   - não existe referência desconhecida ao ID absorvido.
3. Escolha o canônico pela maior soma de campos preenchidos e relações
   operacionais; desempate por `createdAt` mais antigo e menor ID.
4. Preencha somente campos nulos do canônico, reparentando as seis FKs dentro da
   mesma transação. Recalcule `numberOfDependents` a partir da tabela.
5. Insira uma auditoria `associate_identity_reconciled` no canônico com os IDs
   técnicos absorvidos e contagens por tabela; não inclua valores cadastrais.
6. Exclua absorvidos apenas após provar que nenhuma FK conhecida permanece.

## TDD em fatias verticais

1. Relatório conecta uma cadeia CPF → SIAPE → e-mail em um componente.
2. Relatório não contém valores PII, hashes ou ciphertext.
3. Nome ou identificador divergente torna o componente ambíguo.
4. Mensalidade repetida no mesmo período torna o componente ambíguo.
5. Seleção do canônico e desempates produzem sempre o mesmo ID.
6. Hash divergente impede qualquer escrita.
7. Falha no reparentamento faz rollback integral.
8. Segunda execução após sucesso é idempotente e reporta zero componentes.

Use PostgreSQL sintético para provar FKs, transação, advisory lock e rollback.
Testes unitários cobrem somente serialização segura e escolha determinística.

## Fluxo operacional

1. Rodar `report` contra produção em transação read-only e arquivar apenas o
   resumo agregado e o hash.
2. Se houver ambiguidade, STOP: não aplique componentes parciais.
3. Repetir `report` imediatamente antes da janela autorizada.
4. Executar `apply` com o hash exato e `ON_ERROR_STOP`.
5. Rodar `report` novamente; exigir zero componentes duplicados.
6. Só então executar a migration do Plano 059.

## Gates

- Testes focados do comando e integração PostgreSQL.
- `npm run lint` → `npm run typecheck` → `npm run test` →
  `npm run test:db` → `npm run build`.
- Revisão separada Standards/Spec contra este plano.

## Critérios de conclusão

- [ ] Report é determinístico, read-only e não contém PII.
- [ ] Apply exige hash, lock e elegibilidade integral.
- [ ] Todas as FKs conhecidas são reparentadas atomicamente.
- [ ] Conflito produz zero mutações e diagnóstico privado.
- [ ] Auditoria técnica explica cada absorção.
- [ ] Produção termina sem colisões nos três blind indexes.

## Condições de STOP

- Qualquer conflito de nome, hash, campo cadastral ou mensalidade.
- Referência a associado fora das seis FKs conhecidas.
- Mudança de relatório entre inventário e aplicação.
- Necessidade de decrypt ou inspeção de valor PII para decidir o canônico.
- Rollback, advisory lock ou contrato de auditoria não podem ser provados em
  PostgreSQL sintético.
