import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockInsertReturning,
  mockResetReturning,
  mockIncrementReturning,
  mockSelectLimit,
  mockInsert,
  mockUpdateWhere,
  mockUpdate,
} = vi.hoisted(() => {
  const insertReturning = vi.fn();
  const onConflictDoNothing = vi.fn(() => ({ returning: insertReturning }));
  const insertValues = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values: insertValues }));

  const resetReturning = vi.fn();
  const incrementReturning = vi.fn();
  const updateWhere = vi
    .fn()
    .mockImplementationOnce(() => ({ returning: resetReturning }))
    .mockImplementationOnce(() => ({ returning: incrementReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const selectLimit = vi.fn();
  return {
    mockInsertReturning: insertReturning,
    mockResetReturning: resetReturning,
    mockIncrementReturning: incrementReturning,
    mockSelectLimit: selectLimit,
    mockInsert: insert,
    mockUpdateWhere: updateWhere,
    mockUpdate: update,
  };
});

vi.mock('@/lib/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockSelectLimit,
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  rateLimits: {
    attempts: 'attempts',
    expiresAt: 'expiresAt',
    key: 'key',
    scope: 'scope',
    updatedAt: 'updatedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...conds: unknown[]) => ({ and: conds })),
  eq: vi.fn((col: string, val: unknown) => ({ op: 'eq', col, val })),
  gt: vi.fn((col: string, val: unknown) => ({ op: 'gt', col, val })),
  lt: vi.fn((col: string, val: unknown) => ({ op: 'lt', col, val })),
  lte: vi.fn((col: string, val: unknown) => ({ op: 'lte', col, val })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

import { consumeIpRateLimit } from '@/lib/rate-limit';

describe('consumeIpRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockInsertReturning.mockResolvedValue([]);
    mockResetReturning.mockResolvedValue([]);
    mockIncrementReturning.mockResolvedValue([]);
    mockSelectLimit.mockResolvedValue([]);

    mockUpdateWhere
      .mockReset()
      .mockImplementationOnce(() => ({ returning: mockResetReturning }))
      .mockImplementationOnce(() => ({ returning: mockIncrementReturning }));
  });

  it('allows the first request with an insert-only path', async () => {
    mockInsertReturning.mockResolvedValueOnce([
      { attempts: 1, expiresAt: new Date(Date.now() + 60_000) },
    ]);

    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60_000,
      maxRequests: 5,
    });

    expect(result).toEqual({ allowed: true, remaining: 4 });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('resets an expired window without relying on a prior read', async () => {
    mockResetReturning.mockResolvedValueOnce([
      { attempts: 1, expiresAt: new Date(Date.now() + 60_000) },
    ]);

    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60_000,
      maxRequests: 5,
    });

    expect(result).toEqual({ allowed: true, remaining: 4 });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('increments an active window after an insert conflict', async () => {
    mockIncrementReturning.mockResolvedValueOnce([
      { attempts: 3, expiresAt: new Date(Date.now() + 30_000) },
    ]);

    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60_000,
      maxRequests: 5,
    });

    expect(result).toEqual({ allowed: true, remaining: 2 });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockSelectLimit).not.toHaveBeenCalled();
  });

  it('blocks when the active window is already saturated', async () => {
    const expiresAt = new Date(Date.now() + 30_000);
    mockSelectLimit.mockResolvedValueOnce([{ attempts: 5, expiresAt }]);

    const result = await consumeIpRateLimit('192.168.1.1', 'test_action', {
      windowMs: 60_000,
      maxRequests: 5,
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockSelectLimit).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid limiter options', async () => {
    await expect(
      consumeIpRateLimit('192.168.1.1', 'test_action', {
        windowMs: 0,
        maxRequests: 5,
      }),
    ).rejects.toThrow('windowMs must be a positive integer.');

    await expect(
      consumeIpRateLimit('192.168.1.1', 'test_action', {
        windowMs: 60_000,
        maxRequests: 0,
      }),
    ).rejects.toThrow('maxRequests must be a positive integer.');
  });
});
