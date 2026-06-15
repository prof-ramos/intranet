import { beforeEach, describe, expect, it, vi } from 'vitest';

let callCount = 0;

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown, key: string[]) => {
    const id = ++callCount;
    const wrapper = async () => {
      return { result: await fn(), id, key };
    };
    return wrapper;
  },
}));

import { withCache } from './with-cache';

describe('withCache', () => {
  beforeEach(() => {
    callCount = 0;
  });

  it('passes ttl as revalidate and tags to unstable_cache', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const cached = withCache({
      fn,
      keyFn: () => ['test-key'],
      ttl: 42,
      tags: ['tag-a', 'tag-b'],
    });

    const result = await cached();

    expect(result.key).toEqual(['test-key']);
  });

  it('forwards arguments to the wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue(123);
    const cached = withCache({
      fn,
      keyFn: (a: number, b: string) => ['key', String(a), b],
      ttl: 10,
      tags: [],
    });

    const result = await cached(7, 'x');

    expect(fn).toHaveBeenCalledWith(7, 'x');
    expect(result.result).toBe(123);
    expect(result.key).toEqual(['key', '7', 'x']);
  });

  it('without maxEntries reuses the same unstable_cache for identical keys', async () => {
    const fn = vi.fn().mockResolvedValue('v');
    const cached = withCache({
      fn,
      keyFn: (n: number) => ['n', String(n)],
      ttl: 5,
      tags: [],
    });

    const r1 = await cached(1);
    const r2 = await cached(1);

    expect(r1.id).toBe(r2.id);
    expect(callCount).toBe(1);
  });

  it('with maxEntries reuses the same unstable_cache for identical keys', async () => {
    const fn = vi.fn().mockResolvedValue('v');
    const cached = withCache({
      fn,
      keyFn: (n: number) => ['n', String(n)],
      ttl: 5,
      tags: [],
      maxEntries: 10,
    });

    const r1 = await cached(1);
    const r2 = await cached(1);

    expect(r1.id).toBe(r2.id);
    expect(callCount).toBe(1);
  });

  it('with maxEntries limits entries and evicts oldest', async () => {
    const fn = vi.fn().mockResolvedValue('v');
    const cached = withCache({
      fn,
      keyFn: (n: number) => ['n', String(n)],
      ttl: 5,
      tags: [],
      maxEntries: 2,
    });

    const r1 = await cached(1);
    await cached(2);
    await cached(3); // evicts key for n=1
    const r4 = await cached(1); // creates new because evicted

    expect(r1.id).not.toBe(r4.id);
    expect(callCount).toBe(4);
  });
});
