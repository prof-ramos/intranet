import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const requireRoleMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const recipientsMock = vi.fn();
const generatePdfMock = vi.fn();
const logDataAccessMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));
vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));
vi.mock('@/lib/ip', () => ({ getTrustedClientIp: vi.fn(() => '127.0.0.1') }));
vi.mock('@/lib/etiquetas/associates', () => ({
  getEtiquetaRecipientsByIds: (...args: unknown[]) => recipientsMock(...args),
}));
vi.mock('@/lib/etiquetas', () => ({
  generateEtiquetasFromRecipients: (...args: unknown[]) => generatePdfMock(...args),
  etiquetaRouteRequestSchema: {
    safeParse: (value: unknown) => ({ success: true, data: value }),
  },
}));
vi.mock('@/lib/audit/service', () => ({
  logDataAccess: (...args: unknown[]) => logDataAccessMock(...args),
}));

describe('POST /app/etiquetas/gerar', () => {
  const body = { templateCode: '6180', recipientIds: [1], mode: 'postal', flags: {} };

  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    recipientsMock.mockResolvedValue([{ id: '1', nome: 'Ana' }]);
    generatePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    logDataAccessMock.mockResolvedValue(undefined);
  });

  it('rate limits and audits the PII PDF export', async () => {
    const response = await POST(
      new NextRequest('http://localhost/app/etiquetas/gerar', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(200);
    expect(consumeIpRateLimitMock).toHaveBeenCalledWith(
      'account:7',
      'etiquetas_pdf',
      { windowMs: 60_000, maxRequests: 3 },
    );
    expect(logDataAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 7,
        action: 'export',
        entityType: 'associate',
        metadata: expect.objectContaining({ format: 'pdf_labels', recipientCount: 1 }),
      }),
    );
  });

  it('rejects a limited request before resolving or decrypting recipients', async () => {
    consumeIpRateLimitMock.mockResolvedValueOnce({ allowed: false });

    const response = await POST(
      new NextRequest('http://localhost/app/etiquetas/gerar', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(429);
    expect(recipientsMock).not.toHaveBeenCalled();
    expect(generatePdfMock).not.toHaveBeenCalled();
  });
});
