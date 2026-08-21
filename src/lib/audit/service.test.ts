import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@/lib/logger';
import { logAuditAction, logAuditBestEffort, logDataAccess } from './service';

// Use vi.hoisted to ensure mockInsert is available when vi.mock callbacks run
const { mockInsert, mockValues } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: mockInsert.mockReturnValue({ values: mockValues }),
  },
}));

vi.mock('@/lib/sanitize-pii', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sanitize-pii')>();
  return {
    ...actual,
    sanitizePiiValue: vi.fn((val: unknown) => val),
  };
});

import { sanitizePiiValue } from '@/lib/sanitize-pii';

describe('logAuditAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it('inserts audit record with correct fields', async () => {
    await logAuditAction({
      adminId: 1,
      action: 'update',
      entityType: 'associate',
      entityId: 42,
      changes: { old: { name: 'Old' }, new: { name: 'New' } },
      metadata: { source: 'form' },
    });

    expect(mockInsert).toHaveBeenCalled();
  });

  it('sanitizes PII in changes field via sanitizePiiValue', async () => {
    const changes = { old: { cpf: '12345678901' }, new: { cpf: '98765432100' } };
    await logAuditAction({
      adminId: 1,
      action: 'update',
      entityType: 'associate',
      changes,
    });

    expect(sanitizePiiValue).toHaveBeenCalledWith(changes);
  });

  it('sanitizes PII in metadata field via sanitizePiiValue', async () => {
    const metadata = { email: 'user@example.com' };
    await logAuditAction({
      adminId: 1,
      action: 'update',
      entityType: 'associate',
      metadata,
    });

    expect(sanitizePiiValue).toHaveBeenCalledWith(metadata);
  });

  it('throws when adminId is not a positive integer', async () => {
    await expect(
      logAuditAction({
        adminId: -1,
        action: 'update',
        entityType: 'associate',
      }),
    ).rejects.toThrow('Invalid audit actor');

    await expect(
      logAuditAction({
        adminId: 0,
        action: 'update',
        entityType: 'associate',
      }),
    ).rejects.toThrow('Invalid audit actor');

    await expect(
      logAuditAction({
        adminId: 1.5 as unknown as number,
        action: 'update',
        entityType: 'associate',
      }),
    ).rejects.toThrow('Invalid audit actor');
  });

  it('accepts adminId null and inserts with performedBy null', async () => {
    await logAuditAction({
      adminId: null,
      action: 'auto_mark_overdue',
      entityType: 'monthly_payment',
      entityId: 42,
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        performedBy: null,
        action: 'auto_mark_overdue',
        entityType: 'monthly_payment',
        entityId: 42,
      }),
    );
  });

  it('uses executor when provided', async () => {
    const mockTxInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    const mockTx = { insert: mockTxInsert } as never;

    await logAuditAction({
      adminId: 5,
      action: 'test',
      entityType: 'associate',
      executor: mockTx,
    });

    // Should call insert on the executor, not on the default db mock
    expect(mockTxInsert).toHaveBeenCalled();
    // Ensure the default db.insert was also still available (just not used)
    expect(mockInsert).not.toHaveBeenCalledWith(expect.anything());
  });

  it('does not throw on DB error (logs and swallows)', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    });

    // Should NOT throw
    await expect(
      logAuditAction({
        adminId: 1,
        action: 'update',
        entityType: 'associate',
      }),
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[AUDIT_FAILURE]',
      expect.objectContaining({
        adminId: 1,
        action: 'update',
      }),
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it('rethrows DB errors for a transactional executor so the mutation rolls back', async () => {
    const failure = new Error('transactional audit failed');
    const mockTx = {
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockRejectedValue(failure) }),
    } as never;

    await expect(
      logAuditAction({
        adminId: 1,
        action: 'update',
        entityType: 'monthly_payment',
        executor: mockTx,
      }),
    ).rejects.toBe(failure);
  });
});

describe('logAuditBestEffort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it('inserts the audit record when adminId is valid', async () => {
    await logAuditBestEffort({
      adminId: 1,
      action: 'official_letter_cancelled',
      entityType: 'official_letter',
      entityId: 12,
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'official_letter_cancelled', entityId: 12 }),
    );
  });

  it('swallows a synchronously-thrown invalid adminId and warns without leaking payload', async () => {
    const warn = vi.fn();

    await expect(
      logAuditBestEffort(
        {
          adminId: -1,
          action: 'official_letter_cancelled',
          entityType: 'official_letter',
          entityId: 12,
          metadata: { recipient: 'secret recipient name' },
        },
        { warn } as never,
      ),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith('Audit log failed after committed mutation', {
      action: 'official_letter_cancelled',
      entityType: 'official_letter',
      entityId: 12,
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret recipient name');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('logDataAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it('prefixes view action as data_view', async () => {
    await logDataAccess({
      adminId: 1,
      action: 'view',
      entityType: 'associate',
      entityId: 42,
    });

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ action: 'data_view' }));
  });

  it('prefixes export action as data_export', async () => {
    await logDataAccess({
      adminId: 1,
      action: 'export',
      entityType: 'associate',
    });

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ action: 'data_export' }));
  });

  it('prefixes edit action as data_edit', async () => {
    await logDataAccess({
      adminId: 1,
      action: 'edit',
      entityType: 'associate',
      entityId: 42,
    });

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ action: 'data_edit' }));
  });

  it('delegates to logAuditAction with prefixed action and PII sanitization', async () => {
    await logDataAccess({
      adminId: 5,
      action: 'view',
      entityType: 'associate',
      entityId: 100,
      metadata: { page: 'profile' },
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'data_view',
        performedBy: 5,
        entityType: 'associate',
        entityId: 100,
      }),
    );
    // Verify PII sanitization was called (since logAuditAction uses it)
    expect(sanitizePiiValue).toHaveBeenCalled();
  });
});
