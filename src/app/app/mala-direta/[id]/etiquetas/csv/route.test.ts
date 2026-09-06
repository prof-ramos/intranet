import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const requireRoleMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const buildCsvMock = vi.fn();
const logDataAccessMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));
vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));
vi.mock('@/lib/ip', () => ({ getTrustedClientIp: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/mailing', () => ({
  buildCampaignEtiquetasCsv: (...args: unknown[]) => buildCsvMock(...args),
}));
vi.mock('@/lib/audit/service', () => ({
  logDataAccess: (...args: unknown[]) => logDataAccessMock(...args),
}));

describe('POST /app/mala-direta/[id]/etiquetas/csv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    buildCsvMock.mockResolvedValue('"nome";"email"\r\n"Ana";"ana@asof.org.br"');
    logDataAccessMock.mockResolvedValue(undefined);
  });

  it('gera CSV, aplica rate limit e audita o export', async () => {
    const response = await POST(
      new NextRequest('http://localhost/app/mala-direta/9/etiquetas/csv', { method: 'POST' }),
      { params: Promise.resolve({ id: '9' }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(buildCsvMock).toHaveBeenCalledWith(9);
    expect(logDataAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 7,
        action: 'export',
        metadata: { format: 'csv_labels', campaignId: 9 },
      }),
    );
  });

  it('rejeita rate limit antes de montar o CSV', async () => {
    consumeIpRateLimitMock.mockResolvedValueOnce({ allowed: false });

    const response = await POST(
      new NextRequest('http://localhost/app/mala-direta/9/etiquetas/csv', { method: 'POST' }),
      { params: Promise.resolve({ id: '9' }) },
    );

    expect(response.status).toBe(429);
    expect(buildCsvMock).not.toHaveBeenCalled();
  });
});
