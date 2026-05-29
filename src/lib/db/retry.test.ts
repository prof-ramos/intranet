import { describe, it, expect, vi } from 'vitest';
import { retryTransientConnection } from './retry';

function transientError(message = 'connection closed'): Error {
  return Object.assign(new Error(message), { code: 'ECONNRESET' });
}

describe('retryTransientConnection', () => {
  it('returns result on successful first attempt', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await retryTransientConnection(op);
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error and succeeds', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce('ok');
    const result = await retryTransientConnection(op);
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on non-transient error', async () => {
    const op = vi.fn().mockRejectedValue(new Error('syntax error'));
    await expect(retryTransientConnection(op)).rejects.toThrow('syntax error');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    const op = vi.fn().mockRejectedValue(transientError('connection reset'));
    await expect(retryTransientConnection(op, 3)).rejects.toThrow('connection reset');
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

    vi.useRealTimers();
  });
});
