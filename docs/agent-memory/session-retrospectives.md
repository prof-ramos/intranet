# Retrospectivas de Sessão

> Problemas encontrados, decisões tomadas, pendências, riscos e itens que ainda não devem virar regra permanente.
> Cada entrada é datada. Itens podem ser promovidos para feedback.md, project.md ou security.md após confirmação.

---

## 2026-06-15 — Dashboard de associados: listagem, detalhes, edição + autoreview

**Problema**: Após migração legada (1750 registros, 21+ campos novos), a UI mostrava apenas 5 colunas e não expunha os novos dados. Todos os usuários autenticados devem ver dados completos (sistema interno, requisito explícito).

**Decisões tomadas**:
- `canViewSensitiveFields()` alterado para sempre retornar `true` — requisito explícito do usuário
- Página de listagem expandida de 5 para 9 colunas com filtro por situação associativa
- Página de detalhes expandida com 4 seções novas (Dados Profissionais, Dependentes, Convênios) + campos expandidos em Identificação, Endereço, Administrativo
- Formulário de edição expandido com 17 campos novos (RG, sexo, estado civil, naturalidade, bairro, CEP, missão, carreira, CEOC/CAOC, etc.)
- RG adicionado ao registro PII (`pii-mapping.ts`) com padrão triple-column
- Pipeline de dados atualizado em 7 camadas (repository → service → pii-mapping → validation → action → form → detail page)

**Lições promovidas para memória permanente:**
- → `docs/agent-memory/feedback.md`: Checkbox "on" vs "true"; nullable enum select com empty string
- → `docs/agent-memory/project.md`: Pipeline de 7 camadas para campos novos; canViewSensitiveFields sempre true
- → `docs/agent-memory/security.md`: LGPD masking desabilitado por requisito; funções preservadas para compliance futuro

**Bugs corrigidos pelo autoreview**:
- P0: Checkbox sem `value="true"` envia "on" que Zod rejeita
- P1: `paymentMethod` Zod schema não aceita empty string do select default
- P1: `paymentMethod` action não converte empty string para null
- P2: Função `booleanOrEmpty` morta removida

**Pendências identificadas e resolvidas na sequência**:
- [x] P1: CRUD de dependentes e convênios (criar/editar/excluir)
- [x] P2: Exportação CSV/relatório expandida com os 21+ campos novos
- [x] P3: Busca por SIAPE e CPF na listagem de associados
- [x] P3: Preservação de filtros na paginação (voltar do detalhe mantém filtros)
- [ ] P3: Testes de integração para o pipeline de escrita dos novos campos

**Riscos**:
- O formulário de edição não foi testado visualmente em staging — campos novos podem ter problemas de layout em mobile.
- O pipeline de escrita dos campos novos ainda merece teste de integração dedicado.

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

## 2026-06-12 — Merge do PR #201 após rebase com conflitos

**Problema**: Branch `claude/tasks-feature-refactor-5gksac` (PR #201) estava CONFLICTING com main. Rebase revelou 2 conflitos: (1) `schema.integration.test.ts` — commit f7392fa conflitou com origin/main; (2) `finance/service.ts` — padrão de domain events divergiu entre HEAD e branch.

**Decisão tomada**:
- Conflito em `finance/service.ts`: resolvido mantendo padrão HEAD (emitir domain events após commit da transação).
- Conflito em `schema.integration.test.ts`: skip inicial do commit f7392fa foi **incorreto** — ambos HEAD e origin/main tinham valores errados, e o commit pulado tinha os corretos. Corrigido com novo commit restaurando os valores do f7392fa.
- Mudanças staged (docs deletados + email test mock): stash antes do rebase, restauradas e commitadas separadamente.

**Lições promovidas para memória permanente:**
- → `docs/agent-memory/feedback.md`: Skip de commit durante rebase baseado em diff enganoso
- → `docs/agent-memory/project.md`: Schema contract test usa valores em português; Domain events emitidos após commit; CI Database Contract roda contra PostgreSQL real

**Pendências**: Nenhuma.

**Riscos para próxima sessão**:
- O `schema.integration.test.ts` em `origin/main` continua com valores incorretos (enums em inglês, tabelas desatualizadas). Branches futuras que rebaseiem de main terão o mesmo problema até que main seja atualizada com os valores corretos.
- O teste de contrato é frágil — qualquer mudança no schema Drizzle exige atualização manual das expectativas.

---

## 2026-06-12 — Merge de documentação agent-memory

**Problema**: Nenhum — revisão do patch aprovada sem bugs, 4 arquivos de documentação prontos para merge.

**Decisão tomada**: Merge direto em `main` sem PR intermediário (documentação sem código).

**Lições promovidas para memória permanente:**
- → `docs/agent-memory/feedback.md`: Git não autorizado por default — requer aprovação explícita
- → `docs/agent-memory/project.md`: Fluxo de merge de documentação validado

**Pendências**: Nenhuma.

**Riscos para próxima sessão**: Nenhum identificado.

---

## 2026-06-15 — Autoreview findings + Neon dev branch + Migração de dados legados

**Problema**: 3 rodadas de autoreview (2 da sessão anterior compactada + 1 nova) identificaram P0-P3 findings. Após correções, foco mudou para planejamento de migração de dados legados e infraestrutura Neon.

**Decisões tomadas**:
- P0 `.gitignore *.sql` bloqueando migrações Drizzle: corrigido com `!drizzle/**/*.sql` após `*.sql` (ordem importa)
- P2 Côte d'Ivoire: adicionado ao COUNTRY_ALIASES em vez de aceitar divergência SQL/TS
- P2 WHEN clauses: refatorado para `sql` tagged templates (coluna Drizzle-managed) mantendo `sql.raw()` para constantes
- Dados web (`chancelaria_web_indexed.json`) confirmados como fonte única de migração — sem necessidade de MySQL/VPS
- Branch `dev/migration-test` criada no Neon (schema-only) para testar migrations antes de produção
- Journal de migrações populado manualmente (schema-only não copia dados)

**Lições promovidas para memória permanente:**
- → `docs/agent-memory/feedback.md`: Ignorar instrução sobre VPS; insistência com neonctl; assumir Free Tier sem branching
- → `docs/agent-memory/project.md`: Neon via Vercel Storage; Free Tier suporta branching; schema-only branches não copiam journal; JSON web como fonte única
- → `docs/agent-memory/security.md`: Connection string visível em neonctl output; não acessar VPS legada sem autorização

**Pendências**:
- [ ] Schema migration 0020: adicionar 16 colunas faltantes ao `associates.ts` + novos enums (sex, maritalStatus, missionType, careerOrigin) + tabelas novas (dependents, health_agreements)
- [ ] Implementar `scripts/migrate-legacy.ts` lendo de `chancelaria_web_indexed.json`
- [ ] Atualizar DATABASE.md (documenta só 12/20 migrações)
- [ ] Atualizar `schema.integration.test.ts` para refletir novas colunas
- [ ] Commitar alterações do `.gitignore` e `.neon` gitignore (não commitados ainda)
- [ ] Deletar dumps `.sql` decomprimidos em `data/asof-prod-dump/` (PII em plaintext)

**Riscos para próxima sessão**:
- A branch `dev/migration-test` tem scale-to-zero; cold start ~500ms. Se a sessão demorar, o compute pode suspender.
- O `drizzle.__drizzle_migrations` na branch dev foi populado manualmente — se `drizzle-kit generate` criar migration 0020, o hash da migration deve ser consistente entre dev e main.
- A connection string da branch dev foi exposta no output do neonctl — considerar rotação se houver preocupação de segurança.
- 16 colunas novas no `associates.ts` vão gerar migration SQL grande — validar na branch dev antes de aplicar em main.

---

## 2026-06-15 — Arquitetura de Server Actions do PR #201

**Problema**: O refactor do PR #201 apertou a fronteira de Server Actions, mas a decisão arquitetural ainda estava documentada só em artefato temporário (`/tmp/refactor-intranet.md`) e no histórico do PR.

**Decisão tomada**:
- `defineServerAction` e `defineFormStateAction` agora são fronteiras schema-first: toda action com entrada deve declarar schema Zod.
- `defineNoInputServerAction` é o helper canônico para Server Actions sem entrada.
- O fallback cru de `FormData`/payload sem schema não deve ser reintroduzido.
- Falso positivo importante de revisão: `formDataToRecord()` preserva chaves repetidas via `FormData.getAll()`, então campos como `subscribedEvents` continuam suportando múltiplos valores.

**Lições promovidas para memória permanente:**
- → `docs/agent-memory/project.md`: Server Actions com entrada exigem schema Zod; actions sem entrada usam `defineNoInputServerAction`.

**Pendências**: Nenhuma.

**Riscos para próxima sessão**:
- Ao adicionar novas actions, não contornar o helper com casts ou parsing manual antes do schema.
- Ao revisar campos multivalorados de formulário, verificar `formDataToRecord()` antes de assumir perda de arrays.

---

## 2026-06-15 — Fixes E2E dashboard + associados, autoreview round 4, merge de branch, cleanup de branches

**Problema**: Após merge do PR #210 (dashboard associados), CI falhou com 2 erros E2E: (1) dashboard — `PostgresError 42803` em `_getTopRegions` por coluna não-agregada no GROUP BY; (2) associados update — `PostgresError 22007` por string vazia `""` em campo date. Além disso, autoreview round 4 trouxe 5 findings (1 P1, 3 P2, 1 P3).

**Decisões tomadas**:
- E2E dashboard: adicionar `assignments.type` e `associates.locationCountry` ao `.groupBy()` da query CASE
- E2E associados update: normalizar campos date com `emptyToNull(v) = v === '' ? null : v ?? null`
- Autoreview P1 (open redirect): regex `^/app/[\w/_-]*$` em vez de `startsWith('/app/')`
- Autoreview P2 (silent delete): `.returning()` + verificação de row count nos deletes
- Autoreview P2 (unvalidated associateId): incluir `associateId` no Zod schema de update
- Autoreview P3 (debug grid): respeitar `options.startPosition ?? 1`
- Autoreview P2 (paymentMethod null): **rejeitado** como comportamento intencional (coluna NOT NULL com default)
- Branch cleanup: `git fetch --prune` revelou que todos os branches já estavam mergeados/deletados no GitHub

**Lições promovidas para memória permanente**:
- → `docs/agent-memory/feedback.md`: `??` não pega empty string em campos date; `Number(formData.get())` produz NaN; fetch --prune revela merge; cherry-pick abortado por arquivo inexistente
- → `docs/agent-memory/project.md`: GROUP BY com CASE exige colunas internas explícitas; E2E dev server log como diagnóstico primário; Playwright browser pode não estar instalado
- → `docs/agent-memory/security.md`: safeReturnTo regex padrão; delete com row count check via `.returning()`

**Pendências identificadas e resolvidas na sequência**:
- [x] E2E dashboard: GROUP BY corrigido e verificado (8/8 passaram)
- [x] E2E associados update: emptyToNull aplicado e verificado
- [x] Autoreview round 4: 4/5 findings corrigidos, 1 rejeitado intencionalmente
- [x] Merge `feat/dashboard-associados-completo` → `main` + delete branch
- [x] Cleanup de branches: todos os branches remoto já estavam mergeados; `cancel-session` deletado do remote
- [ ] P3: Testes de integração para CRUD dependentes/convênios (pendência pré-existente)

**Riscos**:
- Branch `cancel-session` tinha fix para `find_unused.sh`, mas o arquivo foi removido do repo em merge anterior. Fix é obsoleto.
- O `main` agora contém todos os merges. Push foi feito. Zero branches remoto exceto `main`.
