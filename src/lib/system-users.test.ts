import { vi, describe, it, expect, beforeEach } from 'vitest';
import { resolveSystemBotUser } from './system-users';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  admins: {},
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('resolveSystemBotUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module-level cache by re-evaluating the module
    vi.resetModules();
  });

  it('returns existing bot user id and caches it', async () => {
    const { db } = await import('@/lib/db');
    const selectMock = vi.mocked(db.select);
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 123 }])),
        })),
      })),
    } as any);

    const { resolveSystemBotUser: resolve } = await import('./system-users');
    const result1 = await resolve();
    expect(result1).toBe(123);

    // Second call should not hit db.select again because of cache
    const result2 = await resolve();
    expect(result2).toBe(123);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('creates bot user when none exists and returns the id', async () => {
    const { db } = await import('@/lib/db');
    const selectMock = vi.mocked(db.select);
    const insertMock = vi.mocked(db.insert);

    // First select: no user by name
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    } as any);

    // insert returns created user
    insertMock.mockReturnValueOnce({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 456 }])),
        })),
      })),
    } as any);

    const { resolveSystemBotUser: resolve } = await import('./system-users');
    const result = await resolve();
    expect(result).toBe(456);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('uses cached value on second call without querying DB', async () => {
    const { db } = await import('@/lib/db');
    const selectMock = vi.mocked(db.select);
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 789 }])),
        })),
      })),
    } as any);

    const { resolveSystemBotUser: resolve } = await import('./system-users');
    await resolve();
    expect(selectMock).toHaveBeenCalledTimes(1);

    await resolve();
    await resolve();
    expect(selectMock).toHaveBeenCalledTimes(1);
  });
});
