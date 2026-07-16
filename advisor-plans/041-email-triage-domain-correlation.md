# Plano 041: Impedir criação automática de Consulta e Atividade pela triagem de e-mail

> **Instruções ao executor**: execute o plano integralmente, sem preservar o
> comportamento contraditório por compatibilidade. Pare nas condições de STOP.
>
> **Verificação de drift**:
> `git diff --stat f6cb73e..HEAD -- CONTEXT.md ARCHITECTURE.md src/lib/email-triage/pipeline.ts src/lib/email-triage/pipeline.test.ts src/lib/email-triage/domain-materializer.ts src/lib/email-triage/domain-materializer.test.ts src/lib/email-triage/correlate.ts src/lib/email-triage/correlate.test.ts src/lib/email-triage/correlation-actions.ts`
> Mudança na regra documental ou no formato de `CorrelationAction` é STOP.

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: MÉDIO
- **Depende de**: nenhum
- **Categoria**: bug
- **Planejado em**: `main` commit `f6cb73e`, 2026-07-16

## Por que isso importa

O produto permite nota operacional automática somente quando há exatamente uma
Consulta aberta do associado. O pipeline possui um motor puro que implementa
essa regra, mas antes dele chama uma segunda materialização que cria Consulta e
Atividade justamente nos casos zero/múltiplos. Remover o caminho concorrente
restaura a regra jurídica e elimina duplicações e registros canônicos gerados
sem decisão do coordenador.

## Estado atual

- `CONTEXT.md:329-332` e `ARCHITECTURE.md:23-29` são autoritativos: zero,
  múltiplas, arquivada ou respondida permanecem pendentes; exatamente uma aberta
  recebe nota operacional.
- `correlate.ts:31-54` já retorna `skip` para zero/múltiplas e `insert_note`
  somente para exatamente uma.
- `pipeline.ts:191-200` chama `materializarNoDominio` antes da correlação.
- `domain-materializer.ts:151-210` cria Consulta e Atividade quando não encontra
  uma aberta. O comentário em `:165-167` reconhece corrida concorrente.
- `pipeline.ts:211-218` já executa `buildCorrelationContext` → `correlate` →
  `applyCorrelationActions`, que deve se tornar o único caminho automático.

## Comandos necessários

| Finalidade     | Comando                                                                                 | Resultado esperado        |
| -------------- | --------------------------------------------------------------------------------------- | ------------------------- | ---------------- |
| Correlação     | `npx vitest run src/lib/email-triage/correlate.test.ts`                                 | todos passam              |
| Pipeline       | `npx vitest run src/lib/email-triage/pipeline.test.ts`                                  | todos passam              |
| Busca residual | `rg -n "materializarNoDominio                                                           | domain-materializer" src` | nenhum resultado |
| Gates          | `npm run lint && npm run typecheck && npm run test && npm run test:db && npm run build` | todos saem 0              |

## Escopo

**Dentro do escopo**:

- `src/lib/email-triage/pipeline.ts`
- `src/lib/email-triage/pipeline.test.ts`
- `src/lib/email-triage/domain-materializer.ts` (remover)
- `src/lib/email-triage/domain-materializer.test.ts` (remover)
- `src/lib/email-triage/correlate.test.ts` apenas para regressões da regra
- `advisor-plans/README.md`

**Fora do escopo**:

- Alterar o schema de `email_triagens` ou criar migration.
- Criar fluxo novo de prazo, Consulta, Atividade ou UI de revisão.
- Endurecimento do prompt/modelo, tratado pelo Plano 042.
- Mudar conteúdo/semântica da nota automática além do necessário.

## Fluxo Git

- Branch: `advisor/041-email-triage-domain-correlation`
- Commit: `fix(email-triage): honor juridico correlation policy`
- Não publique sem autorização.

## Etapas

### Etapa 1: Tornar a correlação o único caminho automático

Remova de `pipeline.ts` o import e o bloco Step 5b que chama
`materializarNoDominio`. Preserve persistência, notificação, correlação e
labeling na ordem existente. Não mova `applyCorrelationActions` para antes da
persistência.

**Verificar**: `npm run typecheck` passa após a remoção.

### Etapa 2: Remover o materializador contraditório

Exclua `domain-materializer.ts` e seu teste. Confirme por `rg` que não existe
outro consumidor. Não transplante criação de Consulta/Atividade para outro
módulo.

**Verificar**: busca residual não encontra o símbolo nem o caminho.

### Etapa 3: Reescrever as expectativas do pipeline

Remova mock/testes do materializador. Cubra no pipeline:

1. zero consultas → ação `skip`, nenhum efeito jurídico novo;
2. múltiplas → `skip` com revisão pelo coordenador;
3. exatamente uma → `insert_note` aplicado;
4. `exige_validacao_humana=true` → notifica e não aplica correlação.

Use `correlate.test.ts` para as decisões puras e `pipeline.test.ts` apenas para
orquestração.

**Verificar**: ambos os comandos focados passam.

### Etapa 4: Rodar gates

Rode a sequência oficial. Confirme que o diff não inclui services jurídicos,
schema, migrations ou UI.

## Plano de testes

- Preserve os testes que identificam a nota como “Triagem Operacional”.
- Adicione regressão explícita: zero consultas não chama nenhum service de
  criação de Consulta/Atividade.
- Não use banco de produção nem Gmail/Gemini reais; mocks locais são suficientes.

## Critérios de conclusão

- [ ] Só `correlate` decide ações automáticas do domínio.
- [ ] Zero/múltiplas consultas não criam Consulta nem Atividade.
- [ ] Exatamente uma continua gerando nota operacional.
- [ ] Não existe referência a `domain-materializer` em `src/`.
- [ ] Gates passam e índice foi atualizado.

## Condições de STOP

- Uma decisão de produto mais nova que `CONTEXT.md` exige abertura automática.
- Outro módulo público importa `materializarNoDominio`.
- Preservar o vínculo `email_triagens.consultation_id` exige nova transação ou
  migration: pare e proponha plano específico; não reintroduza auto-criação.
- A correlação deixou de garantir “exatamente uma aberta”.

## Notas de manutenção

O campo de vínculo da triagem pode continuar nulo nos casos automáticos; isso é
preferível a inventar atomicidade/idempotência fora do escopo. Uma futura ação
humana de vincular/abrir Consulta deve ser auditada separadamente.
