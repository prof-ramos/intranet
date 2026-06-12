# Pendências Pós-Merge — 2026-06-11

Documento de acompanhamento das pendências técnicas identificadas durante o merge de branches do dia 2026-06-11. Criar como issues no GitHub quando a conectividade estiver disponível.

---

## Issues Já Existentes (do plans/)

As seguintes issues já foram criadas previamente e estão linkadas nos plans:

| # | Título | Status no plans | Issue GitHub |
|---|---|---|---|
| 001 | Fix form actions swallowing Next.js redirect errors | **DONE** | [#156](https://github.com/prof-ramos/intranet/issues/156) |
| 002 | Mandate schema validation in defineServerAction | **BLOCKED** | [#157](https://github.com/prof-ramos/intranet/issues/157) |
| 003 | Fix unstable_cache memory leak in withCache | **BLOCKED** | [#158](https://github.com/prof-ramos/intranet/issues/158) |
| 004 | Replace absolute stream timeout with idle timeout | **DONE** | [#159](https://github.com/prof-ramos/intranet/issues/159) |
| 005 | Make password reset atomic and add sendEmail coverage | **TODO** | [#161](https://github.com/prof-ramos/intranet/issues/161) |
| 006 | Use timing-safe comparison in webhook secret validation | **TODO** | [#162](https://github.com/prof-ramos/intranet/issues/162) |
| 007 | Prevent PII patch from setting columns to undefined | **TODO** | [#160](https://github.com/prof-ramos/intranet/issues/160) |
| 008 | Wire orphaned integration tests into CI and npm scripts | **TODO** | [#163](https://github.com/prof-ramos/intranet/issues/163) |
| 009 | Batch notification inserts in Assinafy webhook handler | **TODO** | [#164](https://github.com/prof-ramos/intranet/issues/164) |

### Status REAL destas issues

**Não foi possível verificar** (timeout de rede no `gh` CLI). Verificar manualmente com:
```bash
gh issue list --state open --limit 20
gh issue list --state closed --limit 20
```

---

## Nova Pendência Identificada Nesta Sessão

### Issue: Fix lint warning em scripts de skill cleaning

- **Localização:** `.agents/skills/skill-cleaner/scripts/skill-cleaner.ts:79`
- **Erro:** `'verbose' is assigned a value but never used`
- **Severidade:** Warning (não bloqueante)
- **Razão para fixar:** Projeto adota política "zero warnings" (memória ativa: fix-all-warnings-and-errors)
- **Fix sugerido:** Renomear para `_verbose` ou remover atribuição
- **Nota:** Arquivo está fora do escopo principal do projeto (`agents/` é tooling interno), mas o lint scaneará recursivamente

---

## Issues que Precisam de Revisão/Reabertura

### Issue 002: Schema validation obrigatória
- **Problema:** Tornar `schema` obrigatório em `defineServerAction` quebra typecheck em 20+ arquivos
- **Ação necessária:** Reescrever como migração incremental (ex: `defineStrictServerAction` ou migrar arquivo a arquivo)
- **Referência:** `plans/002-server-actions-schema.md`

### Issue 003: unstable_cache memory leak
- **Problema:** `unstable_cache` serializa argumentos na chave, quebrando `keyFn` e causando timeout em testes
- **Ação necessária:** Repensar abordagem para evitar serialização forçada
- **Referência:** `plans/003-unstable-cache-leak.md`

---

## Checklist para Acompanhamento

- [ ] Verificar status real das issues #156-#164 no GitHub
- [ ] Criar issue para lint warning em `.agents/skills/skill-cleaner/scripts/skill-cleaner.ts`
- [ ] Decidir se issues BLOCKED (002, 003) devem ser fechadas e recriadas com escopo reduzido
- [ ] Atualizar labels das issues TODO (005-009) com milestone/assignee se aplicável
- [ ] Fechar este documento quando todas as issues estiverem refletidas no GitHub

---

**Criado em:** 2026-06-11  
**Autor:** RALPLAN Merge Execution  
**Motivo:** Sem conectividade `gh` CLI nesta sessão (timeout persistente em api.github.com)
