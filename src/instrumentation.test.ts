/**
 * @vitest-environment node
 *
 * Smoke test for `src/instrumentation.ts` `register()`.
 *
 * register() runs once at Next.js boot and dynamically imports
 * `@/lib/errors/unhandled` only when `process.env.NEXT_RUNTIME === 'nodejs'`.
 * We mock the dynamic import target so we can assert the handler registration
 * is invoked (and is a no-op on the edge runtime) without wiring real
 * process-level listeners that call process.exit(1).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const registerUnhandledHandlers = vi.fn();

vi.mock('@/lib/errors/unhandled', () => ({
  registerUnhandledHandlers,
}));

describe('src/instrumentation.ts register()', () => {
  const originalNextRuntime = process.env.NEXT_RUNTIME;

  beforeEach(() => {
    registerUnhandledHandlers.mockReset();
    // Clear the module cache so `register` re-evaluates against the current
    // NEXT_RUNTIME value on each import.
    vi.resetModules();
  });

  afterEach(() => {
    if (originalNextRuntime === undefined) {
      delete process.env.NEXT_RUNTIME;
    } else {
      process.env.NEXT_RUNTIME = originalNextRuntime;
    }
  });

  it('registers unhandled handlers when NEXT_RUNTIME=nodejs', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';

    const { register } = await import('@/instrumentation');
    await register();

    expect(registerUnhandledHandlers).toHaveBeenCalledTimes(1);
  });

  it('does not register handlers on the edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';

    const { register } = await import('@/instrumentation');
    await register();

    expect(registerUnhandledHandlers).not.toHaveBeenCalled();
  });

  it('does not register handlers when NEXT_RUNTIME is unset', async () => {
    delete process.env.NEXT_RUNTIME;

    const { register } = await import('@/instrumentation');
    await register();

    expect(registerUnhandledHandlers).not.toHaveBeenCalled();
  });

  it('does not throw when invoked twice (idempotent at the import side)', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';

    const { register } = await import('@/instrumentation');
    await expect(register()).resolves.toBeUndefined();
    await expect(register()).resolves.toBeUndefined();
  });
});