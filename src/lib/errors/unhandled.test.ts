import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerUnhandledHandlers } from './unhandled';

const REGISTERED = Symbol.for('asof.unhandledHandlersRegistered');

describe('registerUnhandledHandlers', () => {
  beforeEach(() => {
    (globalThis as Record<symbol, unknown>)[REGISTERED] = false;
  });

  it('registers process listeners on first call', () => {
    const onSpy = vi.spyOn(process, 'on').mockReturnThis();
    registerUnhandledHandlers();
    expect(onSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    onSpy.mockRestore();
  });

  it('is idempotent', () => {
    const onSpy = vi.spyOn(process, 'on').mockReturnThis();
    registerUnhandledHandlers();
    registerUnhandledHandlers();
    expect(onSpy).toHaveBeenCalledTimes(2); // only once per event type
    onSpy.mockRestore();
  });

  it('calls process.exit(1) when uncaughtException fires', () => {
    const captured = new Map<string, (...args: unknown[]) => void>();
    const onSpy = vi.spyOn(process, 'on').mockImplementation(
      ((event: string, handler: (...args: unknown[]) => void) => {
        captured.set(event, handler);
        return process;
      }) as unknown as typeof process.on,
    );
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => undefined) as unknown as typeof process.exit,
    );

    registerUnhandledHandlers();
    captured.get('uncaughtException')?.(new Error('fatal'));

    expect(exitSpy).toHaveBeenCalledWith(1);

    onSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('calls process.exit(1) when unhandledRejection fires', () => {
    const captured = new Map<string, (...args: unknown[]) => void>();
    const onSpy = vi.spyOn(process, 'on').mockImplementation(
      ((event: string, handler: (...args: unknown[]) => void) => {
        captured.set(event, handler);
        return process;
      }) as unknown as typeof process.on,
    );
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      (() => undefined) as unknown as typeof process.exit,
    );

    registerUnhandledHandlers();
    captured.get('unhandledRejection')?.(new Error('unhandled'));

    expect(exitSpy).toHaveBeenCalledWith(1);

    onSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
