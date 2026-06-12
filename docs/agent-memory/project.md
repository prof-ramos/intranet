# Fatos Estáveis do Projeto

> Arquitetura, stack, comandos validados, fluxos de deploy, decisões técnicas confirmadas e restrições operacionais permanentes.

---

## 2026-06-12 — Jules API não tem cancelamento nativo de sessões

- **Tipo**: Restrição técnica
- **Escopo**: Integração externa (Google Jules)
- **Memória**: A API REST Jules v1alpha expõe apenas 5 métodos para sessões: `create`, `get`, `list`, `sendMessage`, `approvePlan`. **Não existem** endpoints `delete`, `cancel` ou `pause`. O único mecanismo para interromper uma sessão é `sendMessage`, que envia um prompt textual ao agente — ele pode ignorar o comando ou tratá-lo como nova tarefa.
- **Evidência**: Sessão 2026-06-12 — 3 sessões ativas, `sendMessage` com "cancel" não as moveu para `COMPLETED`.
- **Regra preventiva**: Para cancelar sessões Jules, usar o web UI em `https://jules.google.com/session/{id}` como primeira opção, não a API.
- **Confiança**: alta

## 2026-06-12 — `sendMessage` em sessões AWAITING_USER_FEEDBACK

- **Tipo**: Comportamento observado
- **Escopo**: Integração externa (Google Jules)
- **Memória**: Enviar `sendMessage` para sessões no estado `AWAITING_USER_FEEDBACK` as move para `IN_PROGRESS` (o agente processa o prompt como nova entrada), mas **não** garante que irão para `COMPLETED`. O comportamento depende de como o agente interpreta o prompt.
- **Evidência**: Sessão 2026-06-12 — 2 sessões foram de `AWAITING_USER_FEEDBACK → IN_PROGRESS` após `sendMessage` com "cancel", e permaneceram `IN_PROGRESS` indefinidamente.
- **Regra preventiva**: Não confiar em `sendMessage` com comando de cancelamento para sessões `AWAITING_USER_FEEDBACK`. A resposta do agente é imprevisível.
- **Confiança**: alta

## 2026-06-12 — Fluxo de merge de documentação validado

- **Tipo**: Fluxo operacional validado
- **Escopo**: Git workflow para documentação
- **Memória**: Fluxo de merge de branch de feature com documentação validado: `git checkout main` → `git commit -m "docs: ..."` → `git push origin main` → `git branch -d <feature>` → `git push origin --delete <feature>`. Comandos `uv`, `npm`, `gh` autorizados por default no projeto ASOF/intranet.
- **Evidência**: Sessão 2026-06-12 — merge de 4 arquivos docs/agent-memory/ concluído sem conflitos, branch limpa local e remotamente.
- **Regra preventiva**: Para merge de documentação sem código: seguir o fluxo acima. Git requer aprovação explícita por comando (não está no default).
- **Confiança**: alta

## 2026-06-12 — Cancelamento do modo deep-interview via `omx cancel`

- **Tipo**: Procedimento operacional confirmado
- **Escopo**: Workflow OMX
- **Memória**: Quando o modo `deep-interview` bloqueia implementação e `$cancel` ou `$ultragoal` não funcionam via comando shell, usar `omx cancel` diretamente para sair do modo interview e liberar ferramentas de escrita.
- **Evidência**: Sessão 2026-06-12 — `$cancel` e `$ultragoal` via shell não surtiram efeito; `omx cancel` cancelou `deep-interview` e `skill-active` imediatamente.
- **Regra preventiva**: Para sair do deep-interview quando comandos `$*` falharem, usar `omx cancel` como fallback confiável.
- **Confiança**: alta

## 2026-06-12 — Modelo `kimi-k2.6:cloud` incompatível com Codex + ChatGPT

- **Tipo**: Restrição técnica
- **Escopo**: Configuração do autoreview
- **Memória**: O modelo `kimi-k2.6:cloud` configurado no ambiente não é suportado quando usando Codex com conta ChatGPT. Erro retornado: `The 'kimi-k2.6:cloud' model is not supported when using Codex with a ChatGPT account.`
- **Evidência**: Sessão 2026-06-12 — autoreview falhou com status 400 ao revisar commit `72b74e8`.
- **Regra preventiva**: Se autoreview falhar com erro de modelo incompatível, verificar configuração em `.codex/config.toml` ou env `AUTOREVIEW_MODEL` e usar modelo compatível com ChatGPT (ex: `gpt-4.1`, `gpt-5.1`).
- **Confiança**: alta

## 2026-06-12 — Schema contract test usa valores em português

- **Tipo**: Restrição técnica
- **Escopo**: Testes de integração (schema.integration.test.ts)
- **Memória**: O teste de contrato de banco de dados em `src/lib/db/schema.integration.test.ts` valida enums, colunas e índices contra o PostgreSQL real. Vários enums usam valores em português: `activity_priority` → `['baixa', 'normal', 'alta', 'urgente']`, `activity_status` → `['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido']`, `official_letter_status` → `['gerado', 'cancelado', 'rascunho']`, etc. Valores em inglês como `['low', 'medium', 'high', 'urgent']` são **incorretos** e causam falha no CI Database Contract.
- **Evidência**: Sessão 2026-06-12 — CI falhou com `expected [ Array(4) ] to deeply equal [ 'high', 'low', 'medium', 'urgent' ]`.
- **Regra preventiva**: Nunca assumir valores em inglês para enums do banco; sempre verificar o Drizzle schema (`src/lib/db/schema/enums.ts`) ou migrações SQL para os valores corretos.
- **Confiança**: alta

## 2026-06-12 — Domain events emitidos após commit da transação

- **Tipo**: Padrão arquitetural
- **Escopo**: src/lib/finance/service.ts
- **Memória**: Em `autoMarkOverduePaymentsService`, os domain events são coletados dentro da transação mas emitidos **após** o commit (`for (const { event } of events) { await emitDomainEvent(event); }`). O comentário explícito diz "reduce lock window". Já `updateMonthlyPayment` e `cancelMonthlyPayment` chamam `emitDomainEvent({ ... }, tx)` dentro da transação. Ao resolver conflitos de rebase neste arquivo, manter o padrão HEAD (emitir fora da transação) para `autoMarkOverduePaymentsService`.
- **Evidência**: Sessão 2026-06-12 — conflito de rebase resolvido mantendo o padrão HEAD.
- **Regra preventiva**: Não alterar o padrão de emissão de domain events em `autoMarkOverduePaymentsService` sem considerar o comentário sobre lock window.
- **Confiança**: alta

## 2026-06-12 — CI Database Contract roda contra PostgreSQL real

- **Tipo**: Restrição técnica
- **Escopo**: Pipeline CI
- **Memória**: O job `Database Contract` no CI cria um PostgreSQL 16 em container, aplica todas as migrações e roda `src/lib/db/schema.integration.test.ts` validando tables, columns, enums e indexes. Qualquer divergência entre o Drizzle schema e as expectativas do teste causa falha. O teste NÃO usa banco mock — é um teste de contrato contra schema real.
- **Evidência**: Sessão 2026-06-12 — CI falhou quando expectedColumns/expectedEnums/expectedIndexes não bateram com o banco.
- **Regra preventiva**: Ao mudar migrações ou schemas Drizzle, sempre atualizar `schema.integration.test.ts` correspondente. Nunca assumir que o teste está correto sem validar contra o banco real.
- **Confiança**: alta
