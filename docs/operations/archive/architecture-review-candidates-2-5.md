# Architecture Review 2026: Candidatos 2 a 5

Plano operacional para tratar os candidatos 2 a 5 de
`architecture-review-2026.html`. Registro arquivado — `architecture-review-2026.html`
e `docs/development/codex-worktrees-and-automations.md` (referenciados originalmente)
não existem mais no repositório; todos os candidatos abaixo já estão implementados.

## Estado

| Candidato | Tema                   | Execucao recomendada                                 | Estado                        |
| --------- | ---------------------- | ---------------------------------------------------- | ----------------------------- |
| 2         | PII do Associado       | Local ou worktree isolado, sem swarm                 | Implementado                  |
| 3         | Server Actions         | Worktree dedicada; helper serial, migracao por swarm | Implementado no escopo seguro |
| 4         | Rotas de Webhook       | Worktree dedicada + swarm pequeno                    | Implementado                  |
| 5         | Contexto de Correlacao | Local ou worktree isolado, sem swarm                 | Implementado                  |

## Candidato 2: PII do Associado

Decisao: nao usar swarm. O trabalho e concentrado em
`src/lib/associates/pii-mapping.ts` e `src/lib/associates/service.ts`; dividir
entre agentes criaria conflito no mesmo registro `PII_FIELDS`.

Mudanca aplicada:

- `decryptAssociatePii(row)` centraliza a leitura dos campos PII usando o mesmo
  registro de escrita de `buildPiiPatch()`.
- `getAssociateForEdit()` consome o helper e mantem a regra de mascara para
  `secretaria`.

Gates minimos:

```bash
npx vitest run src/lib/associates/pii-mapping.test.ts src/lib/associates/service.test.ts
npm run typecheck
```

## Candidato 3: Server Actions

Decisao: bom candidato para worktree dedicada quando o objetivo for migrar todos
os actions do produto, mas a parte segura coube no checkout atual: primeiro
congelar o contrato do helper comum; depois migrar dominios em paralelo apenas
quando o contrato de erro/redirect for igual.

Worktree sugerida:

```bash
git worktree add .worktrees/architecture-review-actions -b codex/architecture-review-actions main
```

Mudanca aplicada:

1. Criado `parseFormAction(formData, schema, preprocess?)` em
   `src/lib/server-actions/utils.ts`.
2. Testado `parseFormAction()` com:
   - `formDataToRecord()`;
   - `schema.safeParse()`;
   - `firstZodError()`;
   - preprocess opcional;
   - preservacao do texto de erro atual.
3. Migrados os actions que seguiam o padrao direto de throw:
   - `src/app/app/associados/actions.ts`;
   - `src/app/app/juridico/actions.ts`;
   - `src/app/app/email-triage/actions.ts`.

Os actions publicos de auth continuam com validacao propria porque convertem
falhas em redirects especificos, nao em `throw new Error(...)`.

Swarm opcional restante:

| Agente             | Escopo                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| actions-auth       | `src/app/login`, `change-password`, `forgot-password`, `reset-password`; migrar apenas com helper proprio para redirect |
| actions-domain     | `src/app/app/juridico`, `associados`, `atividades`, `financeiro`                                                        |
| actions-config     | `src/app/app/config/**/actions.ts`                                                                                      |
| actions-secretaria | `src/app/app/secretaria/**/actions.ts`                                                                                  |
| verifier           | buscar boilerplate restante e rodar gates                                                                               |

Regras de merge:

- Todos usam o mesmo helper ja criado na fase serial.
- Nenhum agente muda schemas Zod ou contratos de erro sem registrar motivo.
- Migracoes devem ser por dominio para facilitar revert.

Gates minimos:

```bash
rg -n "formDataToRecord\\(|safeParse\\(" src/app -g 'actions.ts'
npm run lint
npm run typecheck
npm run test
```

## Candidato 4: Rotas de Webhook

Decisao: melhor candidato para worktree + swarm. As tres rotas tem testes
proprios e foram migradas incrementalmente para um seam unico no checkout atual.

Worktree sugerida:

```bash
git worktree add .worktrees/architecture-review-webhooks -b codex/architecture-review-webhooks main
```

Mudanca aplicada:

1. Criado `src/lib/integrations/webhook-handler.ts`.
2. Exposto `createWebhookHandler()` com:
   - auth opcional;
   - parse separado;
   - handler separado;
   - `onError` com contexto de auth.
3. Exposto `requireSecretHeader()` para webhooks com secret compartilhado.
4. Migradas as rotas:
   - `src/app/api/v1/events/route.ts`;
   - `src/app/api/webhooks/assinafy/route.ts`;
   - `src/app/api/v1/gmail-webhook/route.ts`.
5. Preservados status codes e ACK idempotente cobertos pelos testes atuais.

Swarm usado conceitualmente / escopos isolaveis:

| Agente           | Escopo                                                     |
| ---------------- | ---------------------------------------------------------- |
| webhook-core     | helper comum + testes unitarios                            |
| webhook-events   | `src/app/api/v1/events/route.ts` + `route.test.ts`         |
| webhook-assinafy | `src/app/api/webhooks/assinafy/route.ts` + `route.test.ts` |
| webhook-gmail    | `src/app/api/v1/gmail-webhook/route.ts` + `route.test.ts`  |
| verifier         | contratos HTTP, logs sem PII, lint/typecheck/test          |

Regras de merge:

- O helper comum entra primeiro.
- Cada rota deve passar seu `route.test.ts` antes de integrar.
- Preservar fail-closed onde ja existe secret obrigatorio.
- Preservar ACK idempotente de provedores quando o codigo atual ja faz isso.

Gates minimos:

```bash
npx vitest run \
  src/app/api/v1/events/route.test.ts \
  src/app/api/webhooks/assinafy/route.test.ts \
  src/app/api/v1/gmail-webhook/route.test.ts
npm run lint
npm run typecheck
npm run test
```

## Candidato 5: Contexto de Correlacao

Decisao: nao usar swarm. A mudanca e pequena e especulativa; worktree e opcional
se houver receio de misturar com o pipeline de e-mail.

Mudanca aplicada:

- `findAssociateWithOpenConsultationsByEmailHash()` faz uma consulta unica com
  `leftJoin` entre associado e consultas abertas.
- `buildCorrelationContext()` calcula o blind index e delega para a query
  combinada.

Gates minimos:

```bash
npx vitest run src/lib/email-triage/correlation-context.test.ts
npm run typecheck
```
