import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const requireRoleMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const generatePdfMock = vi.fn();
const logDataAccessMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));
vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));
vi.mock('@/lib/ip', () => ({ getTrustedClientIp: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/mailing', () => ({
  generateCampaignEtiquetasPdf: (...args: unknown[]) => generatePdfMock(...args),
}));
vi.mock('@/lib/audit/service', () => ({
  logDataAccess: (...args: unknown[]) => logDataAccessMock(...args),
}));

describe('POST /app/mala-direta/[id]/etiquetas/gerar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    generatePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    logDataAccessMock.mockResolvedValue(undefined);
  });

  it('gera PDF, aplica rate limit e audita o export', async () => {
    const response = await POST(
      new NextRequest('http://localhost/app/mala-direta/12/etiquetas/gerar', { method: 'POST' }),
      { params: Promise.resolve({ id: '12' }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(generatePdfMock).toHaveBeenCalledWith(12);
    expect(consumeIpRateLimitMock).toHaveBeenCalledWith('account:7', 'mailing_etiquetas_pdf', {
      windowMs: 60_000,
      maxRequests: 10,
    });
    expect(logDataAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 7,
        action: 'export',
        metadata: { format: 'pdf_labels', campaignId: 12 },
      }),
    );
  });

  it('rejeita id inválido antes de gerar o PDF', async () => {
    const response = await POST(
      new NextRequest('http://localhost/app/mala-direta/abc/etiquetas/gerar', { method: 'POST' }),
      { params: Promise.resolve({ id: 'abc' }) },
    );

    expect(response.status).toBe(400);
    expect(generatePdfMock).not.toHaveBeenCalled();
  });

  it('rejeita rate limit antes de gerar o PDF', async () => {
    consumeIpRateLimitMock.mockResolvedValueOnce({ allowed: false });

    const response = await POST(
      new NextRequest('http://localhost/app/mala-direta/12/etiquetas/gerar', { method: 'POST' }),
      { params: Promise.resolve({ id: '12' }) },
    );

    expect(response.status).toBe(429);
    expect(generatePdfMock).not.toHaveBeenCalled();
  });
});
