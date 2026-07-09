# Software Factory — resolução de issues abertas

**Criada:** 2026-07-09  
**Objetivo:** processar issues abertas com lanes paralelas, gates de validação e PRs atômicos.

## Gates (ordem oficial)

```bash
npm run lint → npm run typecheck → npm run test → npm run test:db → npm run build
# agregadores: validate:quick | validate:full | pr:check
```

## Lanes desta rodada

| Lane | Issue         | Tipo      | Ação                                                                   | Critério de done                           |
| ---- | ------------- | --------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| A    | #248 plan 010 | CI        | Medir cobertura; se functions ~70%, alinhar threshold + step CI        | `test:coverage` exit 0 + step no workflow  |
| B    | #255 plan 017 | tech-debt | Migrar `etiquetas/actions.ts` para factory; auth holdouts documentados | typecheck+tests; issue comentada           |
| C    | #257 plan 019 | tech-debt | Tipar clusters residual (`events`, assinafy se seguro)                 | menos `Record<string,unknown>` + tests     |
| D    | #258 plan 020 | dx        | Ativar 3 flags baratas no tsconfig + fixes                             | typecheck 0 com flags                      |
| E    | #264 plan 026 | spike     | ADR decisão export LGPD (não feature)                                  | `docs/adr/0XX-…` + issue fechada/comentada |

## Fora de escopo desta fábrica

- Auth actions (login/change/forgot/reset) — redirects customizados; re-escopo separado
- `noUncheckedIndexedAccess` full — multi-PR futuro
- Documentos storage (ADR 008/012) — já fechado #263
- Feature completa de export LGPD — só decisão ADR

## Protocolo do worker

1. Branch `factory/<issue>-<slug>` a partir de `main` atualizado
2. Drift-check do plan file se existir
3. Implementar mínimo viável
4. `npm run validate:quick` (mínimo)
5. PR com `Closes #N` quando o critério for satisfeito
6. Atualizar `advisor-plans/README.md` status

## Orquestrador

- Paralelo quando não há conflito de arquivos
- Serializar se ambos tocam `tsconfig` / CI / mesmo módulo
- Babysit CI até verde; merge com squash
