# Plan 030: Sanitize PII in dev error logs

> **Executor instructions**: Follow this plan step by step.
>
> **Drift check**: `git diff --stat 257b5cc..HEAD -- src/lib/logger.ts src/lib/sanitize-pii.ts`

## Status

- **Priority**: P2 (correctness)
- **Effort**: S (hours)
- **Risk**: LOW
- **Category**: correctness

## Why

In dev mode, the logger doesn't sanitize PII (CPF, email, phone) from log
messages. A developer inspecting local/CI logs could expose LGPD-protected
data. The fix applies `redactPiiString` to all log messages at the entry point.

## Steps

### Step 1: Add import and sanitize message

In `src/lib/logger.ts`, add `redactPiiString` to the import:

```typescript
import { PII_TEXT_PATTERNS, sanitizePiiValue, redactPiiString } from '@/lib/sanitize-pii';
```

In the `log()` private method, sanitize the message:

```typescript
private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: redactPiiString(message),
      // ... rest unchanged
```

**Verify**: `npm run typecheck` → exit 0

### Step 2: Run full test suite

**Verify**: `npm run test` → all tests pass

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` — all pass
- [ ] No files outside `src/lib/logger.ts` are modified
