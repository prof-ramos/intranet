# RALPLAN-DR: RLS Hardening (#31) + Eventos e Notificações (#30)

## Contexto

- **Issue #31**: Endurecer RLS antes de expor Supabase Realtime no browser. Hoje não há cliente Supabase no browser; policies atuais são permissivas (defense-in-depth). Realtime no browser exige RLS restritivas.
- **Issue #30**: Sistema Interno de Eventos e Notificações — MVP com tabela `notifications`, `emitEvent`, `NotificationBell`, Supabase Realtime.
- **Dependência crítica**: #30 depende de #31. O corpo da #30 menciona explicitamente: "Se Supabase Realtime for usado, a tabela deve respeitar políticas de acesso compatíveis."
- **Referência**: ADR em `docs/adr/ADR-001-rls-removal-and-reimplementation.md`

---

## Principles (3-5)

1. **Segurança antes de funcionalidade** — RLS é pré-requisito inegociável para Realtime no browser. Nenhum código que exponha dados ao browser via Supabase client pode ser mergeado sem RLS restritivo validado.
2. **Implementação incremental** — MVP primeiro (eventos/notificações básicos), evoluções (webhooks, email, audit) em versões futuras.
3. **Isolamento via worktrees** — Cada sub-feature em worktree separado para evitar conflitos e permitir revisão granular.
4. **Testabilidade** — Cada etapa tem critérios de aceite verificáveis (unit, integration, schema contract, E2E).
5. **Extensibilidade** — Arquitetura deve permitir webhooks/email/audit no futuro sem refatoração estrutural.

---

## Decision Drivers (top 3)

1. **Segurança**: RLS permissivo atual (`FOR ALL TO PUBLIC`) não suporta browser client. Migração para restritivo é blockador para #30.
2. **Sequência**: #31 deve ser concluída antes de #30 iniciar desenvolvimento de Realtime. Isso é não negociável.
3. **Complexidade**: #30 é um sistema grande (DB schema + migration + backend + frontend + realtime + tests). Deve ser decomposto em tarefas independentes.

---

## Viable Options

### Opção A: Sequencial Puro (1 worktree)
- Fase 1: Issue #31 — RLS hardening completo em único worktree
- Fase 2: Issue #30 — Eventos/Notificações MVP em único worktree
- **Pros**: Simplicidade; menor overhead de coordenação; revisão direta
- **Cons**: #30 só começa após #31; não aproveita paralelismo interno da #30; PR grande para #30

### Opção B: Paralelo com Mock (2+ worktrees)
- #31 e #30 em paralelo; #30 usa mock/fake data para Realtime durante desenvolvimento
- **Pros**: Velocidade aparente; paralelismo máximo
- **Cons**: Risco de retrabalho massivo; integração complexa; testes de segurança podem falhar no merge; viola o Princípio 1
- **Invalidação**: Segurança não deve ser "mockada". Se #30 usa Realtime, precisa de RLS real. Rejeitada.

### Opção C: Monolítico (1 PR)
- Uma única branch/PR com #31 + #30 tudo junto
- **Pros**: Menor overhead de merge
- **Cons**: PR gigante; revisão difícil; rollback complexo; viola o padrão de worktrees documentado em AGENTS.md/CLAUDE.md
- **Invalidação**: Viola o Princípio 3 (isolamento). Rejeitada.

### Opção D: Macro-sequencial + Micro-paralelo com worktrees (RECOMENDADA)
- **Macro**: #31 primeiro (sequencial), depois #30
- **Micro dentro #30**: Decompor em subagentes em worktrees independentes
  - `feature/notifications-db` — Schema Drizzle + migration + indexes
  - `feature/notifications-backend` — `emitEvent` + handlers + Server Actions/API
  - `feature/notifications-ui` — `NotificationBell` + `useNotifications` hook
  - `feature/notifications-tests` — Unit + integration + E2E + schema contract
- **Pros**: Segurança garantida antes de funcionalidade; máxima paralelização segura dentro de #30; isolamento; revisão granular; alinhado com padrão documentado
- **Cons**: Coordenação mais complexa (mas é o papel do Maestro)

---

## Selected Option: Opção D

**Justificativa**: Satisfaz todos os 5 princípios. Garante segurança (Princípio 1), é incremental (Princípio 2), usa worktrees (Princípio 3), é testável (Princípio 4), e é extensível (Princípio 5). A única desvantagem (coordenação) é mitigada pelo Maestro.

---

## Pre-Mortem (3 cenários)

### Cenário 1: RLS migration quebra acesso existente
- **Causa**: Policies restritivas bloqueiam queries server-side existentes que não passam pelo Supabase Auth
- **Mitigação**: Criar policies `FOR ALL TO PUBLIC` temporárias para tabelas não-afetadas; testar `npm run test:db` antes de merge; manter rollback script

### Cenário 2: Supabase Realtime não consegue mapear `admins.id` para JWT claims
- **Causa**: Estratégia de identidade entre Supabase Auth e `admins.id` mal definida
- **Mitigação**: Validar mapeamento com teste de integração antes de implementar #30; ter fallback para polling se Realtime falhar

### Cenário 3: Notificações duplicadas em produção
- **Causa**: `dedupeKey` não implementado corretamente ou race condition no `emitEvent`
- **Mitigação**: `dedupeKey` como constraint unique no banco; transação no `emitEvent`; teste de duplicidade no E2E

---

## Expanded Test Plan

| Nível | O que testar | Quando |
|---|---|---|
| Unit | `emitEvent` handlers, `dedupeKey` logic, RLS policy helpers | Durante desenvolvimento de cada worktree |
| Integration | Mapeamento Supabase Auth ↔ `admins.id`, RLS com usuários distintos | Após #31, antes de #30 |
| Schema Contract | Tabela `notifications`, indexes, enums, constraints | `npm run test:db` em cada worktree |
| E2E | Fluxo completo: finalizar tarefa → emitEvent → notificação → Realtime → Bell | Após integração de todos worktrees |
| Observability | Logs de `emitEvent`, contagem de notificações, erro de conexão Realtime | Em staging/produção |

---

## Orquestração com Worktrees

```
Maestro
│
├─► FASE 1: Issue #31 (RLS Hardening)
│   └── Agente A — worktree: feature/rls-hardening
│       └── Responsabilidade: Mapear tabelas, reescrever policies, validar mapeamento auth, documentar ADR
│
└─► FASE 2: Issue #30 (Eventos e Notificações) — inicia APÓS #31 mergeado
    │
    ├─► Agente B — worktree: feature/notifications-db
    │   └── Schema Drizzle + migration + indexes
    │   └── Critério de aceite: `npm run test:db` passa, migration aplicável
    │
    ├─► Agente C — worktree: feature/notifications-backend
    │   └── `emitEvent`, handlers, Server Actions/API
    │   └── Critério de aceite: `npm run test` passa, handlers cobertos
    │   └── Depende de: B (schema definido)
    │
    ├─► Agente D — worktree: feature/notifications-ui
    │   └── `NotificationBell`, `useNotifications`, integração Realtime
    │   └── Critério de aceite: UI funciona com mock inicial, contratos com backend definidos
    │   └── Depende de: C (API/Actions definidos)
    │
    └─► Agente E — worktree: feature/notifications-tests
        └── Unit + integration + E2E + schema contract
        └── Depende de: B, C, D
        └── Critério de aceite: E2E passa, teste de duplicidade passa, teste de segurança passa
```

### Dependências
- A → (B, C, D, E) — #31 é pré-requisito para toda #30
- B → C — backend precisa do schema
- C → D — UI precisa da API/Actions
- (B, C, D) → E — tests precisam de tudo integrado

### Sequência recomendada
1. Maestro lança Agente A (#31)
2. Agente A termina → Maestro faz merge de #31
3. Maestro lança Agente B (schema)
4. Agente B termina → Maestro faz merge do schema
5. Maestro lança Agente C (backend) e Agente D (UI) em paralelo
   - Agente D pode usar stubs/mock enquanto C não termina, mas não pode mergear antes de C
6. Agente C termina → Maestro merge backend
7. Agente D integra com backend real → Maestro merge UI
8. Maestro lança Agente E (tests)
9. Agente E termina → Maestro merge tests
10. Feature #30 completa

---

## Critérios de Aceite Globais

- [ ] RLS restritivo testado e mergeado (#31)
- [ ] Mapeamento Supabase Auth ↔ `admins.id` documentado e validado
- [ ] Schema `notifications` com indexes e `dedupeKey` criado
- [ ] `emitEvent` com handler `task.completed` funcional
- [ ] `NotificationBell` com contador, dropdown, marcação como lida
- [ ] Supabase Realtime configurado para `notifications` com filtro por `userId`
- [ ] Teste E2E: usuário finaliza tarefa → solicitante recebe notificação em tempo real
- [ ] Teste de segurança: usuário não consegue ler notificações de outro usuário via Supabase client
- [ ] Teste de duplicidade: `dedupeKey` previne notificações duplicadas
- [ ] ADR atualizada com decisão de RLS

---

## ADR (Decision, Drivers, Alternatives, Consequences, Follow-ups)

**Decision**: Adotar abordagem macro-sequencial (#31 → #30) com micro-paralelização via worktrees para #30.

**Drivers**: Segurança (RLS é blockador), sequência (#31 antes de #30), complexidade (#30 grande demais para um agente).

**Alternatives considered**:
- Sequencial puro: Rejeitado por não aproveitar paralelismo
- Paralelo com mock: Rejeitado por violar segurança
- Monolítico: Rejeitado por violar isolamento e gerar PR gigante

**Why chosen**: Satisfaz todos os princípios; alinhado com padrão de worktrees do projeto; permite revisão granular.

**Consequences**:
- Coordenação mais complexa (mitigada pelo Maestro)
- Tempo total maior que monolítico, mas qualidade superior
- Risco de segurança minimizado

**Follow-ups**:
- Após #31 mergeado, atualizar ADR de RLS
- Após #30 v1.0, planejar v1.1 (página de histórico, filtros)
- Após #30 v1.1, planejar v2.0 (webhooks externos)
