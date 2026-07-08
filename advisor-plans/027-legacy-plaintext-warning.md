# Plan 027: Harden PII encryption — warn on legacy plaintext passthrough

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on.
>
> **Drift check**: `git diff --stat 257b5cc..HEAD -- src/lib/crypto/`
> If the file has changed since the plan was written, compare current code
> against the excerpts before proceeding.

## Status

- **Priority**: P1 (security)
- **Effort**: S (hours)
- **Risk**: LOW
- **Category**: security

## Why

`decrypt()` at `src/lib/crypto/index.ts:44-47` returns ciphertext as-is if it
doesn't start with `enc:v1:`. If plaintext PII (CPF, emails, phones) is stored
in DB without encryption, it's silently passed through. The fix adds a
once-per-process warning so operators know when this happens.

## Steps

### Step 1: Add warning to decrypt passthrough

Add a module-level flag and warning in `src/lib/crypto/index.ts`:

```typescript
let warnedLegacyPlaintext = false;

export function decrypt(ciphertext: string, key: string): string {
  if (!ciphertext.startsWith(V1_PREFIX)) {
    if (!warnedLegacyPlaintext && process.env.NODE_ENV !== 'test') {
      warnedLegacyPlaintext = true;
      console.warn('[crypto] decrypt called on non-encrypted value — legacy plaintext passthrough');
    }
    return ciphertext;
  }
  // ... rest unchanged
}
```

**Verify**: `npm run typecheck` → exit 0

### Step 2: Run existing tests

**Verify**: `npx vitest run src/lib/crypto/index.test.ts` → all 32 tests pass

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/crypto/index.test.ts` — 32 tests pass
- [ ] No files outside `src/lib/crypto/index.ts` are modified
