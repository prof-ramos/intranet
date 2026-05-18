import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { GET } from './route';

const consumeIpRateLimitMock = vi.fn();
const requireReportAccessMock = vi.fn();
const parseReportExportParamsMock = vi.fn();
const generateReportMock = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));

vi.mock('@/lib/reports/policy', () => ({
  requireReportAccess: (...args: unknown[]) => requireReportAccessMock(...args),
}));

vi.mock('@/lib/reports/export-filters', () => ({
  parseReportExportParams: (...args: unknown[]) => parseReportExportParamsMock(...args),
}));

vi.mock('@/lib/reports/service', () => ({
  generateReport: (...args: unknown[]) => generateReportMock(...args),
}));

describe('report download route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    requireReportAccessMock.mockResolvedValue({ userId: 9 });
    parseReportExportParamsMock.mockReturnValue({ filters: {}, selectedKeys: ['fullName'] });
    generateReportMock.mockResolvedValue({ csv: '"Nome"\r\n"Maria"', rowCount: 1 });
  });

  it('returns CSV response on success', async () => {
    const response = await GET(
      new Request('https://asof.local/app/associados/relatorio/download') as never,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
  });

  it('logs a safe error when report generation fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    generateReportMock.mockRejectedValue(
      Object.assign(new Error('email=user@example.com'), { code: 'E_REPORT' }),
    );

    const response = await GET(
      new Request('https://asof.local/app/associados/relatorio/download') as never,
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Falha ao gerar relatório.');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[report-download] failed to generate CSV',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_REPORT',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
