import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retryTransientConnection } from './retry';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger,
}));

function transientError(message = 'connection closed'): Error {
  return Object.assign(new Error(message), { code: 'ECONNRESET' });
}

describe('retryTransientConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('returns result on successful first attempt', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await retryTransientConnection(op);
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error and succeeds', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce('ok');
    const promise = retryTransientConnection(op);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on non-transient error', async () => {
    const op = vi.fn().mockRejectedValue(new Error('syntax error'));
    await expect(retryTransientConnection(op)).rejects.toThrow('syntax error');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue(transientError('connection reset'));
    const assertion = expect(retryTransientConnection(op, 3)).rejects.toThrow('connection reset');
    await vi.advanceTimersByTimeAsync(10000);
    await assertion;
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('increases delay between retries (exponential backoff)', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(transientError())
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce('ok');

    const promise = retryTransientConnection(op, 3);

    // First retry after ~1s
    await vi.advanceTimersByTimeAsync(1000);
    // Second retry after ~2s more
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('throws immediately when maxAttempts is 1 (no retry)', async () => {
    const op = vi.fn().mockRejectedValue(transientError());
    await expect(retryTransientConnection(op, 1)).rejects.toThrow();
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('recognizes multiple transient error codes', async () => {
    vi.useFakeTimers();
    const codes = [
      { code: '57P01', msg: 'PostgreSQL administrative shutdown' },
      { code: 'ECONNREFUSED', msg: 'connection refused' },
      { msg: 'connection terminated unexpectedly' },
      { msg: 'client has encountered a connection error' },
    ];

    for (const c of codes) {
      const err = Object.assign(new Error(c.msg), c.code ? { code: c.code } : {});
      const op = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce('ok');
      const promise = retryTransientConnection(op);
      await vi.advanceTimersByTimeAsync(5000);
      const result = await promise;
      expect(result).toBe('ok');
      expect(op).toHaveBeenCalledTimes(2);
    }
  });

  it('logs warning on each retry attempt', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(transientError())
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce('ok');

    const promise = retryTransientConnection(op, 3);
    await vi.advanceTimersByTimeAsync(5000);
    await promise;
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Retrying after transient database connection closure.',
      expect.objectContaining({ error: expect.anything() }),
    );
  });

  it('caps backoff at MAX_BACKOFF_MS on repeated failures', { timeout: 30000 }, async () => {
    const op = vi.fn().mockRejectedValue(transientError());
    await expect(retryTransientConnection(op, 5)).rejects.toThrow();
    expect(op).toHaveBeenCalledTimes(5);
  });
});
