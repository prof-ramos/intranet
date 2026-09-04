import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { exportGmailContactsCsv } from './service';

const getMalaDiretaContactsMock = vi.fn();
const logDataAccessMock = vi.fn();
const logAuditActionMock = vi.fn();

vi.mock('./queries', () => ({
  getMalaDiretaContacts: (...args: unknown[]) => getMalaDiretaContactsMock(...args),
}));

vi.mock('@/lib/audit/service', () => ({
  logDataAccess: (...args: unknown[]) => logDataAccessMock(...args),
  logAuditAction: (...args: unknown[]) => logAuditActionMock(...args),
}));

describe('exportGmailContactsCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMalaDiretaContactsMock.mockResolvedValue([
      {
        name: 'Maria Silva',
        firstName: 'Maria',
        lastName: 'Silva',
        email: 'maria@example.com',
      },
    ]);
    logDataAccessMock.mockResolvedValue(undefined);
    logAuditActionMock.mockResolvedValue(undefined);
  });

  it('returns CSV shaped for Gmail Contacts import', async () => {
    const result = await exportGmailContactsCsv(7, { associationStatus: 'associado' });

    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain('"Name","First Name","Last Name","Email 1 - Value"');
    expect(result.csv).toContain('"Maria Silva","Maria","Silva","maria@example.com"');
    expect(logDataAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 7,
        action: 'export',
        metadata: expect.objectContaining({
          format: 'gmail_contacts_csv',
          rowCount: 1,
        }),
      }),
    );
  });

  it('logs a safe warning when audit persistence fails', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    logDataAccessMock.mockRejectedValue(
      Object.assign(new Error('email=user@example.com'), { code: 'E_AUDIT' }),
    );

    await exportGmailContactsCsv(7, { associationStatus: 'associado' });

    expect(warnSpy).toHaveBeenCalledWith('[mala-direta] failed to persist data access log', {
      error: {
        kind: 'error',
        name: 'Error',
        code: 'E_AUDIT',
        digest: undefined,
      },
    });
    warnSpy.mockRestore();
  });
});
