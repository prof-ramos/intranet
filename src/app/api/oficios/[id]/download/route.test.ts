import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { GET } from './route';

const requireRoleMock = vi.fn();
const findOfficialLetterByIdMock = vi.fn();
const generateOfficialLetterPdfMock = vi.fn();
const logAuditActionMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/oficios/repository', () => ({
  findOfficialLetterById: (...args: unknown[]) => findOfficialLetterByIdMock(...args),
}));

vi.mock('@/lib/oficios/pdf', () => ({
  generateOfficialLetterPdf: (...args: unknown[]) => generateOfficialLetterPdfMock(...args),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: (...args: unknown[]) => logAuditActionMock(...args),
}));

describe('oficio pdf download route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    findOfficialLetterByIdMock.mockResolvedValue({
      id: 1,
      number: 'Ofício nº 001/2026-ASOF',
    });
    generateOfficialLetterPdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    logAuditActionMock.mockResolvedValue(undefined);
  });

  it('returns 400 for invalid ids', async () => {
    const response = await GET(new Request('https://asof.local') as never, {
      params: Promise.resolve({ id: 'abc' }),
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('ID inválido');
  });

  it('returns 400 for non-decimal id encodings', async () => {
    const response = await GET(new Request('https://asof.local') as never, {
      params: Promise.resolve({ id: '0x10' }),
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('ID inválido');
  });

  it('returns a PDF response and audits download', async () => {
    const response = await GET(new Request('https://asof.local') as never, {
      params: Promise.resolve({ id: '1' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('Of_cio_n__001_2026-ASOF.pdf');
    expect(logAuditActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 7,
        action: 'official_letter_downloaded',
        entityType: 'official_letter',
        entityId: 1,
      }),
    );
  });

  it('logs a safe error and returns 500 when PDF generation fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    generateOfficialLetterPdfMock.mockRejectedValue(
      Object.assign(new Error('email=user@example.com'), { code: 'E_PDF' }),
    );

    const response = await GET(new Request('https://asof.local') as never, {
      params: Promise.resolve({ id: '1' }),
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Erro ao gerar PDF');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'PDF download failed for oficio',
      {
        officialLetterId: 1,
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_PDF',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
