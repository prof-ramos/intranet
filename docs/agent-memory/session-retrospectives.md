# Retrospectivas de Sessão

> Problemas encontrados, decisões tomadas, pendências, riscos e itens que ainda não devem virar regra permanente.
> Cada entrada é datada. Itens podem ser promovidos para feedback.md, project.md ou security.md após confirmação.

---

## 2026-06-12 — Cancelamento de sessões Jules via API

**Problema**: 2 sessões Jules (`Palette: UX & Accessibility Specialist Agent`, `Bolt: Performance Optimization Agent`) permaneceram `IN_PROGRESS` mesmo após múltiplos comandos de cancelamento via `sendMessage`.

**Decisão tomada**: Abandonar tentativa via API e deixar expirar naturalmente.

**Lições promovidas para memória permanente:**
- → `docs/agent-memory/feedback.md`: Excesso de repetição sem pivot, não investigar estado antes de agir
- → `docs/agent-memory/project.md`: Jules API sem cancel nativo, comportamento de `sendMessage` em `AWAITING_USER_FEEDBACK`

**Pendências:**
- Verificar se as 2 sessões eventualmente transitaram para `COMPLETED` ou `FAILED`.
- Investigar se existe endpoint não documentado ou Google API Client Library com suporte a cancel.

**Riscos para próxima sessão:**
- Se houver outras sessões Jules ativas, usar web UI como primeira opção.
- API Jules pode não refletir estado real imediatamente — aguardar ~30s entre requisições.

---

*Template: `## YYYY-MM-DD — Título curto` seguido de Problema, Decisão, Lições promovidas, Pendências e Riscos.*

## 2026-06-12 — Merge de documentação agent-memory

**Problema**: Nenhum — revisão do patch aprovada sem bugs, 4 arquivos de documentação prontos para merge.

**Decisão tomada**: Merge direto em `main` sem PR intermediário (documentação sem código).

**Lições promovidas para memória permanente:**
- → `docs/agent-memory/feedback.md`: Git não autorizado por default — requer aprovação explícita
- → `docs/agent-memory/project.md`: Fluxo de merge de documentação validado

**Pendências**: Nenhuma.

**Riscos para próxima sessão**: Nenhum identificado.

---

