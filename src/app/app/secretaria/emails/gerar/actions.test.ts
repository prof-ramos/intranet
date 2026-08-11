import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateEmailAction } from './actions';
import { GeminiError } from '@/lib/ai/errors';

// ── Mocks ────────────────────────────────────────────────────────────────────

const headersMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const requireAuthMock = vi.fn();
const requireRoleMock = vi.fn();
const isGeminiConfiguredMock = vi.fn();
const generateEmailContentMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: (...args: unknown[]) => headersMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));

vi.mock('@/lib/ip', () => ({
  getTrustedClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/ai/settings', () => ({
  isGeminiConfigured: (...args: unknown[]) => isGeminiConfiguredMock(...args),
}));

vi.mock('@/lib/ai/gemini', () => ({
  generateEmailContent: (...args: unknown[]) => generateEmailContentMock(...args),
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  headersMock.mockResolvedValue(new Headers());
  consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
  requireAuthMock.mockResolvedValue({ userId: 1, role: 'secretaria' });
  requireRoleMock.mockResolvedValue({ userId: 1, role: 'secretaria' });
  isGeminiConfiguredMock.mockResolvedValue(true);
  generateEmailContentMock.mockResolvedValue({
    subject: 'Assunto gerado',
    html: '<!doctype html><html><body>Conteúdo</body></html>',
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateEmailAction', () => {
  it('returns success with subject and html on happy path', async () => {
    const result = await generateEmailAction('newsletter', 'Conteúdo da newsletter');
    expect(result).toEqual({
      success: true,
      subject: 'Assunto gerado',
      html: '<!doctype html><html><body>Conteúdo</body></html>',
    });
  });

  it('rejects empty prompt', async () => {
    const result = await generateEmailAction('newsletter', '   ');
    expect(result).toEqual({ success: false, error: 'Descreva o conteúdo do e-mail.' });
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });

  it('rejects invalid email type', async () => {
    const result = await generateEmailAction('invalid_type', 'Conteúdo válido');
    expect(result).toEqual({ success: false, error: 'Tipo de e-mail inválido.' });
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });

  it('accepts all allowed email types', async () => {
    const types = ['newsletter', 'convite', 'comunicado', 'aviso'] as const;
    for (const type of types) {
      const result = await generateEmailAction(type, 'Conteúdo');
      expect(result).toMatchObject({ success: true });
    }
  });

  it('returns error when Gemini is not configured', async () => {
    isGeminiConfiguredMock.mockResolvedValue(false);
    const result = await generateEmailAction('aviso', 'Conteúdo do aviso');
    expect(result).toMatchObject({ success: false });
    expect((result as { success: false; error: string }).error).toContain('chave da API Gemini');
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });

  it('surfaces GeminiError message to the user', async () => {
    generateEmailContentMock.mockRejectedValue(
      new GeminiError('Conteúdo bloqueado pela política de segurança.'),
    );
    const result = await generateEmailAction('comunicado', 'Texto do comunicado');
    expect(result).toEqual({
      success: false,
      error: 'Conteúdo bloqueado pela política de segurança.',
    });
  });

  it('returns generic error for unknown exceptions', async () => {
    generateEmailContentMock.mockRejectedValue(new Error('Network timeout'));
    const result = await generateEmailAction('newsletter', 'Conteúdo da newsletter');
    expect(result).toEqual({ success: false, error: 'Falha ao gerar e-mail.' });
  });

  it('enforces rate limit — throws when limit is exceeded', async () => {
    consumeIpRateLimitMock.mockResolvedValue({ allowed: false });
    await expect(generateEmailAction('convite', 'Conteúdo do convite')).rejects.toThrow(
      'Muitas requisições',
    );
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });

  it('requires the same admin or secretaria role as the page', async () => {
    requireRoleMock.mockRejectedValue(new Error('Sem permissão.'));

    await expect(generateEmailAction('newsletter', 'Conteúdo')).rejects.toThrow('Sem permissão.');
    expect(requireRoleMock).toHaveBeenCalledWith(['admin', 'secretaria']);
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });
});
