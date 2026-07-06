# Plan 003: Fix unstable_cache memory leak in withCache

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 95e67aa..HEAD -- src/lib/cache/with-cache.ts`

## Status

**BLOCKED**: O `unstable_cache` do Next.js automaticamente serializa todos os argumentos passados para o wrapper estático e os insere na chave de cache. Isso quebra o comportamento do nosso `keyFn` (que ignora alguns argumentos intencionalmente). Além disso, causa erro de Timeout em testes como `pdf.test.ts` ao tentar serializar objetos gigantes com `JSON.stringify`. O plano precisa ser repensado para evitar essa serialização forçada.

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `95e67aa`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/158

## Why this matters

The `withCache` function recreates `unstable_cache` wrappers per-request when `maxEntries` is not provided. Next.js memoizes these instances internally, leading to unbounded memory growth (OOM).

## Current state

- `src/lib/cache/with-cache.ts` — Lines 28-35.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Tests     | `npm run test`           | all pass            |

## Scope

**In scope**:
- `src/lib/cache/with-cache.ts`

**Out of scope**:
- Callers of `withCache`.

## Git workflow

- Branch: `advisor/003-unstable-cache-leak`
- Message style: `perf(cache): fix memory leak in withCache wrapper`

## Steps

### Step 1: Remove inline unstable_cache creation

Refactor `withCache` to instantiate `unstable_cache` once at module level (per `withCache` call) and pass the dynamic arguments through, removing the `maxEntries` Map hack if it's no longer necessary, or adjusting it so `unstable_cache` is always created statically.

*Hint*: `unstable_cache` accepts arguments: `unstable_cache(fn, keyParts, options)`. You can wrap the original function once and just invoke the cached wrapper with `...args`.

**Verify**: `npm run typecheck` → exit 0

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0

## STOP conditions

- If you cannot maintain the dynamic `keyFn` behavior with a static wrapper.
