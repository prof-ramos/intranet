import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { GET } from './route';

const consumeIpRateLimitMock = vi.fn();
const requireRoleMock = vi.fn();
const exportGmailContactsCsvMock = vi.fn();
const parseMalaDiretaFiltersMock = vi.fn();

vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/mala-direta', () => ({
  exportGmailContactsCsv: (...args: unknown[]) => exportGmailContactsCsvMock(...args),
  parseMalaDiretaFilters: (...args: unknown[]) => parseMalaDiretaFiltersMock(...args),
}));

describe('GET /app/secretaria/mala-direta/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    requireRoleMock.mockResolvedValue({ userId: 3, role: 'secretaria' });
    parseMalaDiretaFiltersMock.mockReturnValue({ associationStatus: 'associado' });
    exportGmailContactsCsvMock.mockResolvedValue({
      csv: '"Name"\r\n"Maria"',
      rowCount: 1,
    });
  });

  it('returns CSV attachment on success', async () => {
    const response = await GET(
      new Request('https://asof.local/app/secretaria/mala-direta/download') as never,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('mala-direta-gmail-');
  });

  it('logs a safe error when generation fails', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    exportGmailContactsCsvMock.mockRejectedValue(
      Object.assign(new Error('email=user@example.com'), { code: 'E_EXPORT' }),
    );

    const response = await GET(
      new Request('https://asof.local/app/secretaria/mala-direta/download') as never,
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Falha ao gerar a lista de contatos.');
    expect(errorSpy).toHaveBeenCalledWith(
      '[mala-direta-download] failed to generate CSV',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_EXPORT',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});
