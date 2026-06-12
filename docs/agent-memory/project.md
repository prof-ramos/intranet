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
