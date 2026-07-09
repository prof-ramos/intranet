import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { events, mockBcryptHash, mockLogger, mockSendEmail } = vi.hoisted(() => ({
  events: [] as string[],
  mockBcryptHash: vi.fn(),
  mockLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  mockSendEmail: vi.fn(),
}));

function makeSelect(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => rows),
      })),
    })),
  };
}

/** Supports both rate-limit (`onConflictDoUpdate().returning()`) and token (`returning()`). */
function makeInsert(returningRows: unknown[] = [{ attempts: 1, id: 99 }]) {
  const returning = vi.fn(async () => returningRows);
  return {
    values: vi.fn(() => ({
      returning,
      onConflictDoUpdate: vi.fn(() => ({
        returning,
      })),
    })),
  };
}

function makeDelete(eventName: string) {
  return {
    where: vi.fn(async () => {
      events.push(eventName);
    }),
  };
}

const txUpdateReturningRows: unknown[][] = [];
const txAdminUpdateWhere = vi.fn(async () => {
  events.push('tx:update-admin');
});
const txDeleteWhere = vi.fn(async () => {
  events.push('tx:delete-old-tokens');
});
const txAuditValues = vi.fn(async () => {
  events.push('tx:audit');
});
let txUpdateCallCount = 0;

const dbMock = {
  select: vi.fn(() => makeSelect([])),
  insert: vi.fn(() => makeInsert()),
  delete: vi.fn(() => makeDelete('db:delete')),
  transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
    events.push('tx:start');
    const tx = {
      update: vi.fn(() => {
        txUpdateCallCount += 1;
        if (txUpdateCallCount === 1) {
          return {
            set: vi.fn(() => ({
              where: vi.fn(() => ({
                returning: vi.fn(async () => {
                  events.push('tx:consume-token');
                  return txUpdateReturningRows.shift() ?? [];
                }),
              })),
            })),
          };
        }

        return {
          set: vi.fn(() => ({
            where: txAdminUpdateWhere,
          })),
        };
      }),
      delete: vi.fn(() => ({
        where: txDeleteWhere,
      })),
      insert: vi.fn(() => ({
        values: txAuditValues,
      })),
    };

    return callback(tx);
  }),
};

vi.mock('bcryptjs', () => ({
  default: {
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
}));

vi.mock('@/lib/db', () => ({
  db: dbMock,
}));

vi.mock('@/lib/db/retry', () => ({
  retryTransientConnection: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@/lib/env', () => ({
  env: {
    ASOF_INTRANET_URL: 'https://intranet.asof.org.br',
    MAILJET_API_KEY: 'key',
    MAILJET_SECRET_KEY: 'secret',
    MAILJET_SENDER_VALIDATED: true,
    // Required by hashEmail (rate-limit key material) — test-only fixture, not a real secret.
    ENCRYPTION_MASTER_KEY: 'test-master-key-32-bytes-long-xxxx',
  },
}));

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock('@/lib/email/templates', () => ({
  passwordResetEmailHtml: vi.fn(() => '<html>'),
  passwordResetEmailText: vi.fn(() => 'text'),
}));

vi.mock('@/lib/error-log', () => ({
  toSafeErrorLog: (error: unknown) => ({ message: String(error) }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger,
}));

describe('password reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    events.length = 0;
    txUpdateReturningRows.length = 0;
    txUpdateCallCount = 0;
    dbMock.select.mockReturnValue(makeSelect([]));
    dbMock.insert.mockReturnValue(makeInsert());
    dbMock.delete.mockReturnValue(makeDelete('db:delete'));
    mockBcryptHash.mockResolvedValue('new-password-hash');
    mockSendEmail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('consumes a reset token before updating the password', async () => {
    txUpdateReturningRows.push([{ id: 5, adminId: 7 }]);

    const { consumeResetToken } = await import('./password-reset');
    await consumeResetToken('reset-token', 'new-password');

    expect(events).toEqual([
      'tx:start',
      'tx:consume-token',
      'tx:update-admin',
      'tx:delete-old-tokens',
      'tx:audit',
    ]);
  });

  it('does not update the password when atomic token consumption fails', async () => {
    txUpdateReturningRows.push([]);

    const { consumeResetToken, InvalidResetTokenError } = await import('./password-reset');

    await expect(consumeResetToken('reset-token', 'new-password')).rejects.toThrow(
      InvalidResetTokenError,
    );
    expect(events).toEqual(['tx:start', 'tx:consume-token']);
    expect(txAdminUpdateWhere).not.toHaveBeenCalled();
  });

  it('revokes older reset tokens only after the new email is delivered', async () => {
    vi.useFakeTimers();
    dbMock.select.mockReturnValue(
      makeSelect([{ id: 7, name: 'Admin', email: 'admin@asof.local', isActive: true }]),
    );
    // rate-limit row (attempts) + token row (id) share the same mock shape
    dbMock.insert.mockReturnValue(makeInsert([{ attempts: 1, id: 99 }]));
    // cleanup de tokens expirados (best-effort) + rollback token em caso de falha de email
    let deleteCallCount = 0;
    dbMock.delete.mockImplementation((..._args: unknown[]) => {
      deleteCallCount += 1;
      events.push(deleteCallCount === 1 ? 'db:delete:cleanup' : 'db:delete');
      return { where: vi.fn(async () => {}) };
    });
    mockSendEmail.mockImplementation(async () => {
      events.push('email:sent');
    });

    const { requestPasswordReset } = await import('./password-reset');
    const promise = requestPasswordReset('admin@asof.local');

    // Flush microtasks + advance timers until the function completes
    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(events).toEqual([
      'db:delete:cleanup',
      'email:sent',
      'tx:start',
      'tx:delete-old-tokens',
      'tx:audit',
    ]);
  });

  it('keeps older reset tokens when email delivery fails', async () => {
    vi.useFakeTimers();
    dbMock.select.mockReturnValue(
      makeSelect([{ id: 7, name: 'Admin', email: 'admin@asof.local', isActive: true }]),
    );
    dbMock.insert.mockReturnValue(makeInsert([{ attempts: 1, id: 99 }]));
    // cleanup de tokens expirados (best-effort) + rollback token em caso de falha de email
    let deleteCallCount = 0;
    dbMock.delete.mockImplementation((..._args: unknown[]) => {
      deleteCallCount += 1;
      events.push(deleteCallCount === 1 ? 'db:delete:cleanup' : 'db:delete');
      return { where: vi.fn(async () => {}) };
    });
    mockSendEmail.mockRejectedValue(new Error('mailjet unavailable'));

    const { requestPasswordReset } = await import('./password-reset');
    const promise = requestPasswordReset('admin@asof.local');

    // Flush microtasks + advance timers until the function completes
    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(events).toEqual(['db:delete:cleanup', 'db:delete']);
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('denies password reset when rate-limit storage fails (fail-closed)', async () => {
    vi.useFakeTimers();
    dbMock.insert.mockImplementation(() => {
      throw new Error('password_reset_attempts unavailable');
    });

    const { requestPasswordReset } = await import('./password-reset');
    const promise = requestPasswordReset('admin@asof.local');
    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(dbMock.select).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[requestPasswordReset] Rate-limit check failed; denying request (fail-closed).',
      expect.any(Object),
      expect.any(Error),
    );
  });

  it('denies password reset when rate-limit attempts are exceeded', async () => {
    vi.useFakeTimers();
    dbMock.insert.mockReturnValue(makeInsert([{ attempts: 4, id: 1 }]));

    const { requestPasswordReset } = await import('./password-reset');
    const promise = requestPasswordReset('admin@asof.local');
    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(dbMock.select).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[requestPasswordReset] Rate limit exceeded or unavailable.',
      expect.objectContaining({ emailHash: expect.any(String) }),
    );
  });
});
