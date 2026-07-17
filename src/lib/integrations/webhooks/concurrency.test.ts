import { describe, expect, it } from 'vitest';
import {
  createConcurrencyLimiter,
  mapSettledWithConcurrency,
} from '@/lib/integrations/webhooks/concurrency';

describe('webhook concurrency limiter', () => {
  it.each([0, -1, 1.5, Number.NaN])('rejects invalid limit %s', (limit) => {
    expect(() => createConcurrencyLimiter(limit)).toThrow(
      'concurrency limit must be a positive integer',
    );
  });

  it('preserves result order and never exceeds the configured peak', async () => {
    const limiter = createConcurrencyLimiter(3);
    let active = 0;
    let peak = 0;

    const results = await mapSettledWithConcurrency([40, 10, 30, 20, 0], limiter, async (delay) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, delay));
      active -= 1;
      return delay;
    });

    expect(peak).toBe(3);
    expect(results).toEqual([40, 10, 30, 20, 0].map((value) => ({ status: 'fulfilled', value })));
  });

  it('continues queued work after a rejection without deadlock', async () => {
    const limiter = createConcurrencyLimiter(2);
    const visited: number[] = [];

    const results = await mapSettledWithConcurrency([1, 2, 3, 4], limiter, async (value) => {
      visited.push(value);
      if (value === 2) throw new Error('boom');
      return value * 2;
    });

    expect(visited).toHaveLength(4);
    expect(results.map(({ status }) => status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
    ]);
  });
});
