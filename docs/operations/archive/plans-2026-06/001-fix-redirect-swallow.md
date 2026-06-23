# Plan 001: Fix form actions swallowing Next.js redirect errors

> **⚠️ ALREADY APPLIED** (commit `e65963c`). This plan is kept for historical
> reference only. The fix described below is already in production.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `95e67aa`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/156

## Why this matters

The `defineFormStateAction` wrapper currently catches all internal errors, passing them to an `onError` fallback. However, Next.js implements `redirect()` by throwing a special `NEXT_REDIRECT` error. By swallowing it, actions that intend to navigate the user away instead trap them on the current page. Fixing this restores basic navigation flow.

## Current state

- `src/lib/server-actions/define-form-action.ts` — Lines 122-126 now correctly check for `isRedirectError` before `onError`:

```typescript
// src/lib/server-actions/define-form-action.ts:122
    } catch (error) {
      if (isRedirectError(error)) throw error;
      if (options.onError) return options.onError(error);
      throw error;
    }
```

(Imported at the top of the file from `next/dist/client/components/redirect-error`.)

Repo conventions: Errors from frameworks (like Next.js redirects) must bubble up untouched.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Tests     | `npm run test`           | all pass            |

## Scope

**In scope**:
- `src/lib/server-actions/define-form-action.ts`

**Out of scope**:
- Any other action definitions or callers.

## Git workflow

- Branch: `advisor/001-fix-redirect-swallow`
- Commit per step or per logical unit; message style: `fix(server-actions): allow NEXT_REDIRECT to bubble up in defineFormStateAction`
- Do NOT push or open a PR unless the operator instructed it.

## Verification (applied in commit `e65963c`)

- [x] `npm run typecheck` exits 0
- [x] `npm run test` exits 0
- [x] `grep -C 2 "isRedirectError" src/lib/server-actions/define-form-action.ts` confirms the check is in place.

## Maintenance notes

- Any future wrapper of server actions must also rethrow redirect and notFound errors.
