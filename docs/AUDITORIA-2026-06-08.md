# Relatório de Auditoria Técnica — ASOF Intranet

**Data:** 2026-06-08
**Branch analisada:** `main` (pós-merge dos 3 PRs de refatoração)
**Commits analisados:** `b70bd52`

---

## 1. Resumo Executivo

A codebase é saudável em termos de funcionalidade (CI verde, testes robustos, 462 arquivos TypeScript/TSX), mas acumula ~900–1200 LOC de código duplicado, 15 variáveis de ambiente não documentadas, 13 scripts órfãos, 2 dependências não utilizadas e diversos padrões repetidos que podem ser centralizados. O risco geral da limpeza é **baixo a médio** — a maioria das remoções é trivial e não afeta runtime.

**Principais fontes de lixo técnico:**
1. Duplicação de error boundaries (17 arquivos idênticos)
2. Scripts de setup/MVP não referenciados em nenhum lugar
3. Variáveis de ambiente desincronizadas entre `.env.example` e `env.ts`
4. Padrões de revalidação/cache/auth repetidos em ~15 actions

---

## 2. Tabela de Achados

### Código Morto

| Arquivo | Tipo | Evidência | Recomendação | Confiança | Risco |
|---------|------|-----------|--------------|-----------|-------|
| `src/app/app/atividades/_board/urgency-tiers.test.ts` | Teste órfão (lógica inline) | Não existe arquivo de origem `urgency-tiers.ts`; código do teste é auto-contido | Remover ou extrair lógica para `src/lib/activities/urgency.ts` | Alta | Baixo |
| `src/lib/ui/tokens.ts` (8+ tokens) | Exports não utilizados | `activityColumnBg`, `successBorder`, `floatingBadgeShadow`, `inputBorder`, `inputFocusBorder`, `successTextHover`, `reassignmentNotice`, `alertDangerButtonHoverBg`, `alertDangerButtonHoverBorder` — 0 referências fora do próprio arquivo | Remover tokens não utilizados; manter os que são usados | Alta | Baixo |

### Arquivos Obsoletos / Scripts Órfãos

| Arquivo | Tipo | Evidência | Recomendação | Confiança | Risco |
|---------|------|-----------|--------------|-----------|-------|
| `scripts/backfill-pii-encryption.ts` | Script não referenciado | 0 referências em package.json, CI, docs | Mover para `scripts/archive/` ou deletar | Alta | Baixo |
| `scripts/backup-neon-level1.sh` | Script não referenciado | 0 referências | Documentar no runbook ou remover | Alta | Baixo |
| `scripts/check-db.ts` | Script não referenciado | 0 referências | Remover se for temporário | Alta | Baixo |
| `scripts/codex-pre-tool-use-policy.mjs` | Artefato externo | 0 referências | Remover | Alta | Baixo |
| `scripts/generate-presets.ts` | Script não referenciado | 0 referências | Verificar utilidade; remover | Alta | Baixo |
| `scripts/import-asof-associados-json.ts` | Script one-off | 0 referências | Mover para archive ou documentar | Alta | Baixo |
| `scripts/memlab-scenario.js` | Script não referenciado | 0 referências | Remover se não usado para diagnóstico | Alta | Baixo |
| `scripts/seed-admin-config.ts` | Script não referenciado | 0 referências em package.json | Verificar se é importado por `seed-admin.ts` | Alta | Baixo |
| `scripts/seed-assignments-from-import.ts` | Script one-off | 0 referências | Mover para archive ou remover | Alta | Baixo |
| `scripts/setup-production-env.sh` | Script não referenciado | 0 referências em CI/package.json | Documentar no runbook ou remover | Alta | Baixo |
| `scripts/email-triage/bootstrap-gmail-auth.js` | Script de setup manual | 0 referências | Remover se for artifact de setup | Alta | Baixo |
| `scripts/email-triage/email_triage_mvp_test.py` | Python não referenciado | Projeto é TypeScript/Node.js | Remover | Alta | Baixo |
| `scripts/email-triage/email_triage_mvp.py` | Python não referenciado | Projeto é TypeScript/Node.js | Remover | Alta | Baixo |
| `scripts/email-triage/schema.py` | Python não referenciado | Projeto é TypeScript/Node.js | Remover | Alta | Baixo |

### Dependências

| Pacote | Tipo | Evidência | Recomendação | Confiança | Risco |
|--------|------|-----------|--------------|-----------|-------|
| `cross-env` | Não utilizado | 0 referências em package.json scripts; todos usam `NODE_ENV=...` direto | Remover de devDependencies | Alta | Baixo |
| `@vitejs/plugin-react` | Não utilizado | 0 imports em vitest.config.ts ou qualquer config | Remover de devDependencies | Alta | Baixo |
| `@tiptap/core` | Suspeito (redundante) | 0 imports explícitos em src/; peer dos outros @tiptap/* | Investigar se importado diretamente; se não, remover | Média | Baixo |
| `eslint-config-prettier` | Suspeito (não referenciado) | Não importado em `eslint.config.mjs` | Verificar conflitos ESLint/Prettier; adicionar ou remover | Média | Baixo |

### Configuração

| Item | Tipo | Evidência | Recomendação | Confiança | Risco |
|------|------|-----------|--------------|-----------|-------|
| `.env.example` desincronizada vs `env.ts` | 15 env vars faltando | `CRON_SECRET`, `ENCRYPTION_MASTER_KEY`, `GMAIL_*`, `GEMINI_API_KEY`, `ASSINAFY_*`, etc. presentes em `env.ts` mas ausentes em `.env.example` | Sincronizar `.env.example` com `env.ts` | Alta | Baixo |
| `DATABASE_MIGRATION_URL` | Órfã em `.env.example` | Presente em `.env.example` mas ausente em `env.ts` | Adicionar ao `envSchema` em `env.ts` | Alta | Baixo |
| `INITIAL_ADMIN_EMAIL/PASSWORD` | Órfãs em `.env.example` | Presentes em `.env.example` mas ausentes em `env.ts` | Adicionar ao `envSchema` ou documentar como script-only | Alta | Baixo |
| `DB_CONNECT_TIMEOUT_SECONDS`, `DB_IDLE_TIMEOUT_SECONDS`, `DB_MAX_CONNECTIONS`, `DB_POOL_MODE`, `DB_SSL`, `USE_PGBOUNCER` | Não utilizadas | Presentes em `env.ts` mas 0 consumo em `src/` | Verificar se legacy; remover do `env.ts` se não usadas | Baixa | Baixo |
| `serverExternalPackages: []` em `next.config.ts` | Desnecessária | Array vazio sem efeito | Remover chave | Média | Baixo |
| `.worktrees/**` e `.agents/**` em `eslint.config.mjs` | Desatualizado | Diretórios não existem no projeto | Remover ignores | Baixa | Baixo |

### Duplicação e Complexidade Acidental

| # | Área | Tipo | LOC Estimadas | Recomendação | Confiança | Risco |
|---|------|------|---------------|--------------|-----------|-------|
| 1 | Error boundaries (`src/app/app/**/error.tsx`) | Quase exata | ~350 | Componente `ErrorBoundary` parametrizável | Alta | Baixo |
| 2 | `revalidatePath` em actions | Padrão repetido | ~60 | Helper por domínio em `src/lib/cache/revalidate.ts` | Alta | Baixo |
| 3 | `parseNumericId` em form actions | Quase igual | ~15 | Extrair para `src/lib/form-utils.ts` | Alta | Baixo |
| 4 | `notFound()` em páginas de detalhe | Padrão repetido | ~20 | Helper `requireEntityById()` | Alta | Baixo |
| 5 | `unstable_cache` configuração | Padrão repetido | ~150 | Factory `createCachedQuery()` | Média | Baixo |
| 6 | Keyboard event handlers em modais | Cópia literal | ~20 | Hook `useEscapeKey()` | Alta | Baixo |
| 7 | Inserção de audit log | Quase igual | ~15 | Centralizar via `src/lib/audit/service.ts` | Média | Médio |
| 8 | Constantes de paginação | Hardcoded | ~10 | `src/lib/pagination.ts` | Alta | Baixo |
| 9 | `requireAuth/Role` em actions | Padrão repetido | ~80 | `withAuth()` wrapper | Média | Baixo |
| 10 | Repos count+list | Padrão repetido | ~200 | Factory `createPaginatedRepository()` | Média | Médio |
| 11 | `db.transaction` em services | Padrão repetido | ~40 | Usar `withTransaction()` existente | Baixa | Baixo |

---

## 3. Lista de Remoções Seguras (Baixo Risco)

1. **Remover `cross-env`** de devDependencies — nenhum script o usa
2. **Remover `@vitejs/plugin-react`** de devDependencies — nenhuma config o usa
3. **Remover scripts Python** em `scripts/email-triage/*.py` (3 arquivos) — projeto é TS/Node
4. **Remover scripts não referenciados** de `scripts/` (verificar `seed-admin-config.ts` primeiro)
5. **Remover tokens não utilizados** de `src/lib/ui/tokens.ts`
6. **Remover teste órfão** `urgency-tiers.test.ts` ou extrair lógica para lib
7. **Remover `serverExternalPackages: []`** de `next.config.ts`
8. **Remover ignores fantasma** `.worktrees/**` e `.agents/**` de `eslint.config.mjs`
9. **Sincronizar `.env.example`** com `env.ts` (adicionar env vars faltantes)

---

## 4. Lista de Itens que Exigem Validação

1. **Scripts `scripts/*.ts` não referenciados** — alguns podem ser one-off operacionais. Verificar com time antes de remover.
2. **`@tiptap/core`** — verificar se algum componente importa `Editor` ou tipos do core diretamente.
3. **`eslint-config-prettier`** — verificar se há regras conflitantes; se não houver, remover.
4. **Tokens em `src/lib/ui/tokens.ts`** — verificar se são usados via string interpolation dinâmica (ex: `tokens[inputBorder]`).
5. **`DB_*` env vars** — confirmar se são legacy do Neon/Vercel e podem ser removidas.
6. **Audit log insert em `auth/service.ts` e `reports/audit.ts`** — verificar se a centralização via `audit/service.ts` cobre todos os casos.

---

## 5. Plano de Limpeza em Etapas

### Etapa 1 — Remoções Triviais (5 min)
- `cross-env`, `@vitejs/plugin-react`
- `serverExternalPackages: []` em `next.config.ts`
- Ignores fantasma em `eslint.config.mjs`
- Scripts Python em `scripts/email-triage/`

### Etapa 2 — Limpeza de Scripts e Tokens (15 min)
- Avaliar e mover/remover scripts órfãos de `scripts/`
- Remover tokens não utilizados de `src/lib/ui/tokens.ts`
- Remover ou extrair `urgency-tiers.test.ts`

### Etapa 3 — Sincronização de Configuração (15 min)
- Sincronizar `.env.example` com `env.ts`
- Adicionar `DATABASE_MIGRATION_URL`, `INITIAL_ADMIN_*` ao `envSchema`
- Investigar e remover `DB_*` env vars se legacy

### Etapa 4 — Refatorações Simples (30-60 min)
- Criar `ErrorBoundary` parametrizável
- Extrair `parseNumericId()` helper
- Extrair `requireEntityById()` helper
- Criar `useEscapeKey()` hook
- Centralizar constantes de paginação

### Etapa 5 — Itens que Exigem Teste Manual (30+ min)
- Factory `createCachedQuery()` para cache
- Factory `createPaginatedRepository()` para repos
- `withAuth()` wrapper para actions
- Centralização de audit log inserts

---

## 6. Validação

Após cada etapa:
- `npm install` (se package.json mudou)
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build` (opcional, para Etapa 4+)

---

## 7. Próximos Passos Recomendados

1. **Aprovar e executar Etapas 1-3** — risco baixo, retorno imediato de higiene
2. **Avaliar Etapa 4** — as refatorações simples reduzem ~400 LOC e melhoram manutenibilidade
3. **Agendar Etapa 5** — requer testes mais profundos e validação de comportamento
4. **Investigar `@tiptap/core` e `eslint-config-prettier`** antes de removê-los
5. **Atualizar runbook** para documentar scripts operacionais que devem ser mantidos

---

*Relatório gerado via swarm de agents de auditoria + validação local.*
