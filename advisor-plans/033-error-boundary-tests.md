# Plan 033: Add tests for untested route error boundaries

> **Executor instructions**: Follow this plan step by step.
>
> **Drift check**: `git diff --stat 257b5cc..HEAD -- src/app/app/`

## Status

- **Priority**: P3 (tests)
- **Effort**: M (day-ish)
- **Risk**: LOW
- **Category**: tests

## Why

17 route-level `error.tsx` boundaries exist but only the root one has tests.
Add tests for the most critical routes. Pattern: `src/app/app/error.test.tsx`.

## Steps

### Step 1: Create test files

For each critical route (associados, financeiro, financeiro/mensalidades,
juridico, secretaria/oficios), create `error.test.tsx`:

```typescript
/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorBoundary from './error';

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(),
  })),
}));

describe('src/app/app/<route>/error.tsx', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders the configured title, message and recovery button', () => {
    const reset = vi.fn();
    const error = new Error('route blew up') as Error & { digest?: string };
    render(<ErrorBoundary error={error} reset={reset} />);
    expect(screen.getByRole('heading', { name: '<title>' })).toBeDefined();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeDefined();
  });

  it('invokes reset when "Tentar novamente" is clicked', () => {
    const reset = vi.fn();
    const error = new Error('route blew up') as Error & { digest?: string };
    render(<ErrorBoundary error={error} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
```

**Verify**: `npx vitest run --no-coverage` → all tests pass

## Done criteria

- [ ] Test files exist for critical routes
- [ ] `npx vitest run --no-coverage` — all pass
- [ ] No files outside test files are modified
