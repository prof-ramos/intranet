import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAuditAction, logDataAccess } from './service';

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

vi.mock('@/lib/sanitize-pii', () => ({
  sanitizePiiValue: vi.fn((val: unknown) => val),
}));

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

  it('does not throw on DB error (logs and swallows)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
    );
    consoleErrorSpy.mockRestore();
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

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'data_view' }),
    );
  });

  it('prefixes export action as data_export', async () => {
    await logDataAccess({
      adminId: 1,
      action: 'export',
      entityType: 'associate',
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'data_export' }),
    );
  });

  it('prefixes edit action as data_edit', async () => {
    await logDataAccess({
      adminId: 1,
      action: 'edit',
      entityType: 'associate',
      entityId: 42,
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'data_edit' }),
    );
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