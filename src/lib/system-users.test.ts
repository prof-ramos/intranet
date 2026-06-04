/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { vi, describe, it, expect, beforeEach } from 'vitest';
// resolveSystemBotUser is imported dynamically inside each test to work with vi.mock

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
    vi.resetModules();
  });

  it('returns existing bot user id', async () => {
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
    const result = await resolve();
    expect(result).toBe(123);
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

  it('falls back to select by email when insert conflict occurs', async () => {
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

    // insert returns nothing (conflict)
    insertMock.mockReturnValueOnce({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    } as any);

    // Fallback select by email
    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 789 }])),
        })),
      })),
    } as any);

    const { resolveSystemBotUser: resolve } = await import('./system-users');
    const result = await resolve();
    expect(result).toBe(789);
    expect(selectMock).toHaveBeenCalledTimes(2);
  });
});
