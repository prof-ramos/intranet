import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockLimit, mockInsert, mockUpdate } = vi.hoisted(() => {
  const limit = vi.fn().mockResolvedValue([]);
  const insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  const update = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
  return { mockLimit: limit, mockInsert: insert, mockUpdate: update };
});

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockLimit,
        })),
      })),
    })),
    insert: mockInsert,
    update: mockUpdate,
  },
}));

vi.mock('@/lib/db/schema', () => ({
  rateLimits: {
    id: 'id',
    key: 'key',
    scope: 'scope',
    attempts: 'attempts',
    expiresAt: 'expiresAt',
    updatedAt: 'updatedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: string, val: unknown) => ({ col, val })),
  and: vi.fn((...conds: unknown[]) => conds.length === 1 ? conds[0] : { and: conds }),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

import { consumeIpRateLimit } from '@/lib/rate-limit';

describe('consumeIpRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
  });

  it('allows first request when no record exists', async () => {
    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks request when max is reached within window', async () => {
    const future = Date.now() + 30000;
    mockLimit.mockResolvedValueOnce([
      { id: 1, key: '192.168.1.1:test_action', scope: 'test_action', attempts: 5, expiresAt: new Date(future) },
    ]);
    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('allows request when window has expired', async () => {
    const past = Date.now() - 10000;
    mockLimit.mockResolvedValueOnce([
      { id: 1, key: '192.168.1.1:test_action', scope: 'test_action', attempts: 5, expiresAt: new Date(past) },
    ]);
    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining on each request within window', async () => {
    const future = Date.now() + 30000;
    mockLimit.mockResolvedValueOnce([
      { id: 1, key: '192.168.1.1:test_action', scope: 'test_action', attempts: 2, expiresAt: new Date(future) },
    ]);
    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});