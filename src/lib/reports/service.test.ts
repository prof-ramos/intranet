import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateReport } from './service';

const getAssociatesForReportMock = vi.fn();
const auditReportDownloadMock = vi.fn();
const logDataAccessMock = vi.fn();

vi.mock('./queries', () => ({
  getAssociatesForReport: (...args: unknown[]) => getAssociatesForReportMock(...args),
}));

vi.mock('./audit', () => ({
  auditReportDownload: (...args: unknown[]) => auditReportDownloadMock(...args),
}));

vi.mock('@/lib/audit/service', () => ({
  logDataAccess: (...args: unknown[]) => logDataAccessMock(...args),
}));

describe('reports service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAssociatesForReportMock.mockResolvedValue([
      {
        id: 1,
        fullName: 'Maria da Silva',
        primaryEmail: 'maria@example.com',
      },
    ]);
    auditReportDownloadMock.mockResolvedValue(undefined);
    logDataAccessMock.mockResolvedValue(undefined);
  });

  it('returns CSV and row count', async () => {
    const result = await generateReport(1, {}, ['fullName']);

    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain('"Nome"');
    expect(result.csv).toContain('Maria da Silva');
  });

  it('logs a safe warning when audit persistence fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    auditReportDownloadMock.mockRejectedValue(
      Object.assign(new Error('email=user@example.com'), { code: 'E_AUDIT' }),
    );

    await generateReport(1, {}, ['fullName']);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[report-service] failed to persist audit log',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_AUDIT',
          digest: undefined,
        },
      },
    );
    consoleWarnSpy.mockRestore();
  });

  it('logs a safe warning when data access logging fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logDataAccessMock.mockRejectedValue({ name: 'AuditFailure', code: 'E_LOG', cpf: '123' });

    await generateReport(1, {}, ['fullName']);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[report-service] failed to persist data access log',
      {
        error: {
          kind: 'non_error_thrown',
          name: 'AuditFailure',
          code: 'E_LOG',
          digest: undefined,
        },
      },
    );
    consoleWarnSpy.mockRestore();
  });
});
