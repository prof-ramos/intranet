# Análise de Branches e Issues Abertas — ASOF Intranet

> Arquivo historico da higiene de branches/issues de 29/05/2026. Nao usar como
> fonte viva de PRs, issues ou prioridades atuais; consultar GitHub diretamente.

**Data da análise:** 29/05/2026  
**Atualizado em:** 29/05/2026 (FINAL - após execução completa do plano de higiene)  
**Repositório:** `prof-ramos/intranet` (branch `main`)

---

## Resumo Executivo

Existem **6 PRs abertos** mapeados contra **6 issues abertas**.

### Situações Críticas (após ações de 29/05)

- ✅ **2 PRs duplicados resolvidos** (duplicatas #101/#102)
- ✅ **2 PRs triviais mergeados**:
  - #118 (fix LGPD button label) → fecha #73
  - #117 (atualização ADR 012 Papra) → fecha #93
- ✅ **3 PRs stale de issues fechadas removidos**:
  - #109, #108 e #107 fechados + branches deletadas (`feature/issue-99-assignments-service`, `feature/issue-76-lgpd-tests`, `Pimaco`)
- 🔴 **1 PR conflitante restante**:
  - #105 `feature/issue-98-auth-service` (issue #98 — **prioridade técnica alta**)
- 🟡 **Issue #116** (POC Papra + Garage) — única issue sem branch (bloqueada por #93, cujo ADR foi mergeado).
- ✅ **Convenção de nomenclatura de branches** documentada em [docs/development/branch-naming.md](development/branch-naming.md).

---

## Issues Abertas (6)

| #    | Título                                                      | Labels                          | Criada    | Branch/PR |
|------|-------------------------------------------------------------|---------------------------------|-----------|-----------|
| 116  | POC Papra + Garage para Documentos                          | `enhancement`, `planning`       | 29/05     | **Sem branch** |
| 102  | Dividir Módulo de Auth de Integrações (`integrations/auth.ts`) | `enhancement`, `planning`    | 29/05     | PR #112 |
| 101  | Aprofundar Ciclo de Vida de Upload de Documentos            | `enhancement`, `ready-for-agent`| 29/05     | PR #115 |
| 98   | Colapsar Orquestração de Autenticação em `lib/auth/service.ts` | `enhancement`, `planning`, `ready-for-agent` | 29/05 | **PR #105 (CONFLICTING)** |
| 97   | Decompor Serviço de Associados — extrair `lib/associates/profile.ts` | `enhancement`, `planning` | 29/05 | PR #119 |
| 72   | Implementar política de retenção e exclusão/anonimização automática | `enhancement`, `planning` | 22/05 | PR #120 |

> **Fechadas nesta sessão**:
> - #73 (via PR #118)
> - #93 (via PR #117 + ADR 012)
>
> **Nota:** Issue #99 foi fechada anteriormente via PR #114.

---

## PRs Abertos (6) — Status Atual (após A + C)

### Mergeáveis (5)

| PR   | Branch                                   | Título                                              | Issue | Status     |
|------|------------------------------------------|-----------------------------------------------------|-------|------------|
| 120  | `feat/issue-72-lgpd-retention`           | feat: schedule LGPD retention watchdog              | #72   | MERGEABLE  |
| 119  | `refactor/issue-97-associates-profile`   | refactor: extract associate profile service         | #97   | MERGEABLE  |
| 115  | `refactor/issue-101-documents-service`   | feat: extrair service layer para ciclo de vida de documentos | #101 | MERGEABLE |
| 112  | `refactor/issue-102-split-integrations-auth` | refactor: split integrations/auth.ts (verify + sign) | #102 | MERGEABLE |
| 106  | `feature/pimaco-pdf`                     | feat: implement Pimaco labels PDF generation        | —     | MERGEABLE  |

### Conflitantes / Bloqueados (1)

| PR   | Branch                                   | Título                                              | Issue     | Status      | Ação Recomendada |
|------|------------------------------------------|-----------------------------------------------------|-----------|-------------|------------------|
| 105  | `feature/issue-98-auth-service`          | refactor: collapse auth orchestration into service  | #98 (aberta) | **CONFLICTING** | **Prioridade técnica alta** — rebase + resolução manual |

---

## Ações Realizadas (29/05/2026)

### Manhã
1. **Merge em andamento abortado** na branch `feature/issue-98-auth-service` (PR #105).
2. **Duplicatas eliminadas** (#101 e #102):
   - PR #113 e #111 fechados + branches `fix/` deletadas.
3. **Convenção oficial de nomenclatura** criada em `docs/development/branch-naming.md`.

### Tarde (A + C executados)
4. **Merges de baixo risco**:
   - PR #118 (fix LGPD button label) mergeado → fecha issue #73.
   - PR #117 (atualização ADR 012 - Papra) mergeado → fecha issue #93.
5. **Limpeza de PRs stale** (issues já fechadas):
   - PR #109, #108 e #107 fechados com comentários explicativos.
   - Branches deletadas: `feature/issue-99-assignments-service`, `feature/issue-76-lgpd-tests`, `Pimaco`.
6. Documento de análise atualizado para refletir o novo estado (6 PRs / 6 issues).

---

## Branches Stale / Órfãs Remanescentes (remoto)

Além dos 4 PRs conflitantes acima:

- `origin/Pimaco` → PR #107 (fechar + deletar)
- `origin/feature/issue-76-lgpd-tests` → PR #108 (avaliar)
- `origin/feature/issue-99-assignments-service` → PR #109 (fechar)

Estas branches referenciam issues já fechadas e devem ser limpas após decisão sobre os PRs.

---

## Observações e Alertas

### 1. PR #105 (Auth Service) — Maior Prioridade Técnica
- Maior refactor de auth desde o Go-Live.
- Conflitos surgiram principalmente por mudanças em `lib/db/retry.ts`, `src/app/login/actions.*`, `usuarios/actions.*` e `change-password/actions.*`.
- Requer rebase manual + revisão cuidadosa de testes.

### 2. Branch `Pimaco` (PR #107)
Nome completamente enganoso. O trabalho é refactor de autenticação de cron jobs (issue #100, já fechada). Existe branch separada e saudável `feature/pimaco-pdf` (PR #106) para a feature real de etiquetas Pimaco.

### 3. Issue #116 (Papra + Garage)
Única issue aberta **sem qualquer branch**. Escopo é POC controlada de DMS externo (infra + integração backend). Bloqueada por decisão em #93 (PR #117). Não criar branch ainda — aguardar alinhamento de ADR + segurança/LGPD.

### 4. PRs de Issues Fechadas
#108 e #109 estão vinculados a issues já fechadas por outros caminhos (#76 e #99 via #114). Manter PRs abertos só faz sentido se o código ainda for útil e for rebaseado.

### 5. PRs Triviais Prontos para Merge Imediato
- #118 (1 linha de label LGPD)
- #117 (apenas documentação/ADR)

---

## Prioridade Sugerida de Merge (Atualizada após A + C)

### Fase 1 — Baixo Risco (concluída)
- ✅ PR #118 e #117 mergeados

### Fase 2 — Features Isoladas (próximas)
1. **PR #106** — Pimaco PDF (feature completa, isolada)
2. **PR #120** — LGPD retention watchdog

### Fase 3 — Refactors Médios
3. **PR #119** — Associates profile service
4. **PR #115** — Documents service (ciclo de vida)
5. **PR #112** — Split integrations/auth.ts

### Fase 4 — Alto Impacto (único restante)
6. **PR #105** — Auth service (`lib/auth/service.ts`) ← **rebase + resolver conflitos** (único PR conflitante restante)

---

## Recomendações Imediatas

1. **Definir dono dos 4 PRs conflitantes** (quem vai rebasear #105 vs. quem decide fechar os outros 3).
2. Executar limpeza das 3 branches stale após decisão sobre #107/#108/#109.
3. Revisar se os testes do PR #108 ainda são necessários ou se foram subsumidos por outros testes LGPD (ex: PRs de #72/#73/#76).
4. Para #116: após merge de #117, criar branch de infra/POC apenas quando houver decisão explícita de prosseguir com Papra em ambiente isolado.

---

## Arquivos Relacionados

- [docs/development/branch-naming.md](development/branch-naming.md) — Convenção oficial de branches
- `docs/adr/012-papra-dms-candidate-for-documents.md` — Decisão sobre Papra (referenciada por #93 e #116)
- `.ralplan-execution-plan.md` (untracked) — Plano antigo de execução via swarm de agentes

---

*Documento mantido como referência viva de higiene de branches e issues. Atualizar após cada lote de merges ou limpezas.*

---

## Estado Final — 29/05/2026 (Missão Cumprida)

**Resultado da execução completa do plano:**

- **0 PRs abertos**
- **1 issue aberta restante**: #116 (POC Papra + Garage) — corretamente sem branch (planejamento/infra, bloqueada por decisão já mergeada)
- **0 branches stale ruins** no remote
- **0 worktrees** ativos além do principal
- **PR #105** (auth service completo) mergeado com sucesso após rebase limpo no worktree dedicado
- Todos os 5 PRs mergeáveis restantes (#106, #120, #119, #115, #112) mergeados em ordem segura

**Auth service** (`lib/auth/service.ts` + actions thin) agora é a fonte canônica para autenticação, troca de senha e reset com email.

Repositório está em excelente estado de higiene para o próximo ciclo de desenvolvimento.

**Lições capturadas**:
- Rebase frequente evita este tipo de conflito em refatorações grandes.
- Worktrees são indispensáveis para trabalho em auth + merges complexos.
- "Best of both worlds" (PR + main evolution) é a estratégia vencedora quando há extrações incrementais paralelas.
