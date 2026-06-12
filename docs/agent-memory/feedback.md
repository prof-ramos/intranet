# Feedback do Agente — Erros e Ajustes de Conduta

> Registro de erros cometidos pelo agente, falhas de interpretação, comandos inadequados e ajustes de conduta para evitar repetição.

---

## 2026-06-12 — Excesso de repetição antes de pivotar

- **Tipo**: Erro de estratégia
- **Escopo**: Uso de API externa (Jules)
- **Memória**: Enviei 3 rodadas de `sendMessage` para cancelar sessões Jules vendo que o estado não mudava, sem mudar de abordagem. Deveria ter reconhecido a limitação da API e sugerido o web UI ao usuário após a 1ª tentativa sem efeito.
- **Evidência**: Sessão 2026-06-12 — comando de cancel repetido 3x sem efeito nas sessões `IN_PROGRESS`.
- **Regra preventiva**: Se uma API não oferece o endpoint esperado, não insista no mesmo mecanismo. Após 1 tentativa falha sem mudança de estado, pare e reavalie a abordagem com o usuário.
- **Confiança**: alta

## 2026-06-12 — Não investiguei estado real antes de agir

- **Tipo**: Falha de diagnóstico
- **Escopo**: Uso de API externa (Jules)
- **Memória**: Comecei a cancelar sessões Jules sem primeiro inspecionar as `activities` de cada uma para entender o estado real (o que o agente estava fazendo, qual pergunta havia feito ao usuário). Só fui ver as activities depois de múltiplas tentativas de cancel.
- **Evidência**: Sessão 2026-06-12 — as activities mostravam que os agentes estavam `AWAITING_USER_FEEDBACK` com perguntas específicas, e minha resposta genérica de "cancel" foi tratada como nova tarefa.
- **Regra preventiva**: Antes de interagir com um agente/sistema externo, investigue o estado atual via o endpoint de activities/logs correspondente. Isso evita enviar comandos ineficazes.
- **Confiança**: alta

## 2026-06-12 — Dependência excessiva de API sem fallback

- **Tipo**: Suposição incorreta
- **Escopo**: Uso de API externa (Jules)
- **Memória**: Assumi que a API Jules teria um endpoint de cancelamento de sessões ou que `sendMessage` seria suficiente. Não validei essa suposição verificando a documentação completa antes de começar a executar comandos com o usuário.
- **Evidência**: Sessão 2026-06-12 — a API v1alpha expõe apenas `create`, `get`, `list`, `sendMessage`, `approvePlan`. Sem `delete`, `cancel` ou `pause`.
- **Regra preventiva**: Antes de iniciar uma operação com API externa, verifique se o endpoint existe e se o comportamento é o esperado. Se não existir, comunique a limitação ao usuário imediatamente e proponha alternativas.
- **Confiança**: média

## 2026-06-12 — Git não autorizado por default

- **Tipo**: Erro de validação
- **Escopo**: Comandos git fora do sandbox
- **Memória**: O primeiro `git branch -d` ficou pendente por 386s aguardando aprovação. O usuário explicitou após o aborto que `uv`, `npm` e `gh` estão autorizados por default, mas `git` não estava incluído.
- **Evidência**: Comando abortado após 386.8s, usuário precisou intervir manualmente.
- **Regra preventiva**: Sempre solicitar aprovação explícita para comandos `git` que alteram o repositório (commit, push, branch -d, merge, reset). Não assumir que git está autorizado por default.
- **Confiança**: alta
