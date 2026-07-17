import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import {
  cancelOfficialLetterAction,
  generateAiTextAction,
  markAssinafySubmissionInterruptedAction,
  saveOfficialLetterAction,
  sendForSignatureAction,
  updateOfficialLetterAction,
} from './actions';

const {
  requireRoleMock,
  requireAuthMock,
  findOfficialLettersMock,
  findOfficialLetterByIdMock,
  generateOfficialLetterContentMock,
  saveOfficialLetterMock,
  updateOfficialLetterMock,
  cancelOfficialLetterMock,
  markAssinafySubmissionInterruptedMock,
  sendForSignatureMock,
  revalidatePathMock,
  envMock,
  isGeminiConfiguredMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  requireAuthMock: vi.fn(),
  findOfficialLettersMock: vi.fn(),
  findOfficialLetterByIdMock: vi.fn(),
  generateOfficialLetterContentMock: vi.fn(),
  saveOfficialLetterMock: vi.fn(),
  updateOfficialLetterMock: vi.fn(),
  cancelOfficialLetterMock: vi.fn(),
  markAssinafySubmissionInterruptedMock: vi.fn(),
  sendForSignatureMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  envMock: { NEXT_PUBLIC_AI_ENABLED: true as boolean },
  isGeminiConfiguredMock: vi.fn(),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/ip', () => ({
  getTrustedClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/lib/oficios/repository', () => ({
  findOfficialLetters: (...args: unknown[]) => findOfficialLettersMock(...args),
  findOfficialLetterById: (...args: unknown[]) => findOfficialLetterByIdMock(...args),
}));

vi.mock('@/lib/oficios/service', () => ({
  saveOfficialLetter: (...args: unknown[]) => saveOfficialLetterMock(...args),
  updateOfficialLetter: (...args: unknown[]) => updateOfficialLetterMock(...args),
  cancelOfficialLetter: (...args: unknown[]) => cancelOfficialLetterMock(...args),
  markAssinafySubmissionInterrupted: (...args: unknown[]) =>
    markAssinafySubmissionInterruptedMock(...args),
  sendForSignature: (...args: unknown[]) => sendForSignatureMock(...args),
}));

vi.mock('@/lib/ai/gemini', () => ({
  generateOfficialLetterContent: (...args: unknown[]) => generateOfficialLetterContentMock(...args),
}));

vi.mock('@/lib/ai/settings', () => ({
  isGeminiConfigured: (...args: unknown[]) => isGeminiConfiguredMock(...args),
}));

vi.mock('@/lib/oficios/validations', async () => {
  const { z } = await import('zod');
  return {
    officialLetterFormSchema: z.unknown(),
    officialLetterUpdateValuesSchema: z.unknown(),
  };
});

vi.mock('@/lib/env', () => ({
  env: envMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('secretaria oficios actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    requireAuthMock.mockResolvedValue({ userId: 7, role: 'admin', name: 'Admin' });
    findOfficialLettersMock.mockResolvedValue([]);
    findOfficialLetterByIdMock.mockResolvedValue(null);
    generateOfficialLetterContentMock.mockResolvedValue('texto gerado');
    saveOfficialLetterMock.mockResolvedValue({ id: 1 });
    updateOfficialLetterMock.mockResolvedValue({ id: 1 });
    cancelOfficialLetterMock.mockResolvedValue({ id: 1 });
    markAssinafySubmissionInterruptedMock.mockResolvedValue({ id: 1, assinafyStatus: 'failed' });
    sendForSignatureMock.mockResolvedValue({ success: true, data: { id: 12 } });
    isGeminiConfiguredMock.mockResolvedValue(true);
    envMock.NEXT_PUBLIC_AI_ENABLED = true;
  });

  it('returns AI suggestion on success', async () => {
    const result = await generateAiTextAction({
      recipient: 'Maria',
      recipientRole: 'Presidente',
      subject: 'Assunto',
      itamaratySector: 'SGP',
      signatory: 'João Silva',
      signatoryRole: 'Diretor',
      instruction: 'Escreva um ofício',
    });

    expect(result).toEqual({ success: true, text: 'texto gerado' });
  });

  it('returns disabled error when Gemini key is not configured', async () => {
    isGeminiConfiguredMock.mockResolvedValue(false);

    const result = await generateAiTextAction({
      recipient: 'Maria',
      recipientRole: 'Presidente',
      subject: 'Assunto',
      itamaratySector: 'SGP',
      signatory: 'João Silva',
      signatoryRole: 'Diretor',
      instruction: 'Escreva um ofício',
    });

    expect(result).toEqual({
      success: false,
      error:
        'A chave da API Gemini não está configurada. Solicite ao administrador que configure em Configurações → Integrações → IA.',
    });
    expect(generateOfficialLetterContentMock).not.toHaveBeenCalled();
  });

  it('logs a safe error when AI generation fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    generateOfficialLetterContentMock.mockRejectedValue(
      Object.assign(new Error('email=user@example.com'), { code: 'E_AI' }),
    );

    const result = await generateAiTextAction({
      recipient: 'Maria',
      recipientRole: 'Presidente',
      subject: 'Assunto',
      itamaratySector: 'SGP',
      signatory: 'João Silva',
      signatoryRole: 'Diretor',
      instruction: 'Escreva um ofício',
    });

    expect(result).toEqual({ success: false, error: 'Falha ao gerar sugestão com IA.' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[generateAiTextAction] AI generation failed',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_AI',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it('logs a safe error when saving fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    saveOfficialLetterMock.mockRejectedValue({ name: 'SaveFailure', code: 'E_SAVE', cpf: '123' });

    const result = await saveOfficialLetterAction({
      recipient: 'Maria',
      recipientRole: 'Presidente',
      vocativo: 'Senhora Presidente,',
      letterDate: '2026-05-17',
      subject: 'Assunto',
      itamaratySector: 'SGP',
      signatoryName: 'João Silva',
      signatoryRole: 'Presidente da ASOF',
      closure: 'Atenciosamente,',
      bodyRichText: '<p>Texto</p>',
      bodyPlainText: 'Texto',
    });

    expect(result).toEqual({ success: false, error: 'Falha ao salvar o ofício.' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[saveOfficialLetterAction] save failed',
      {
        error: {
          kind: 'non_error_thrown',
          name: 'SaveFailure',
          code: 'E_SAVE',
          digest: undefined,
        },
      },
      undefined,
    );
    consoleErrorSpy.mockRestore();
  });

  it('logs a safe error when updating fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    updateOfficialLetterMock.mockRejectedValue(new Error('token=secret'));

    const result = await updateOfficialLetterAction(1, { subject: 'Novo assunto' });

    expect(result).toEqual({ success: false, error: 'Falha ao atualizar o ofício.' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[updateOfficialLetterAction] update failed',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: undefined,
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it('logs a safe error when canceling fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    cancelOfficialLetterMock.mockRejectedValue({ name: 'CancelFailure', code: 'E_CANCEL' });

    const result = await cancelOfficialLetterAction(1);

    expect(result).toEqual({ success: false, error: 'Falha ao cancelar o ofício.' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[cancelOfficialLetterAction] cancel failed',
      {
        error: {
          kind: 'non_error_thrown',
          name: 'CancelFailure',
          code: 'E_CANCEL',
          digest: undefined,
        },
      },
      undefined,
    );
    consoleErrorSpy.mockRestore();
  });

  describe('markAssinafySubmissionInterruptedAction', () => {
    it('marks the interrupted claim and revalidates the list', async () => {
      const result = await markAssinafySubmissionInterruptedAction(12);

      expect(markAssinafySubmissionInterruptedMock).toHaveBeenCalledWith(12, 7);
      expect(revalidatePathMock).toHaveBeenCalledWith('/app/secretaria/oficios');
      expect(result).toEqual({ success: true, data: { id: 1, assinafyStatus: 'failed' } });
    });

    it('returns the safe domain error to the operator', async () => {
      const { ValidationError } = await import('@/lib/errors');
      const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      markAssinafySubmissionInterruptedMock.mockRejectedValue(
        new ValidationError('O envio ainda está em andamento.'),
      );

      const result = await markAssinafySubmissionInterruptedAction(12);

      expect(result).toEqual({ success: false, error: 'O envio ainda está em andamento.' });
      consoleErrorSpy.mockRestore();
    });
  });

  describe('sendForSignatureAction', () => {
    const VALID_INPUT = { oficioId: 12, signerEmail: 'signer@example.com' };

    it('calls service with correct params and returns success', async () => {
      const mockData = { id: 12, assinafyStatus: 'pending_signature' };
      sendForSignatureMock.mockResolvedValue({ success: true, data: mockData });

      const result = await sendForSignatureAction(VALID_INPUT);

      expect(sendForSignatureMock).toHaveBeenCalledWith(12, 'signer@example.com', 7);
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('rejects invalid email via Zod schema', async () => {
      await expect(
        sendForSignatureAction({ oficioId: 12, signerEmail: 'invalid' }),
      ).rejects.toThrow('Email inválido.');

      expect(sendForSignatureMock).not.toHaveBeenCalled();
    });

    it('propagates service error response', async () => {
      sendForSignatureMock.mockResolvedValue({
        success: false,
        error: 'Assinafy não está configurado.',
      });

      const result = await sendForSignatureAction(VALID_INPUT);

      expect(result).toEqual({ success: false, error: 'Assinafy não está configurado.' });
    });
  });
});
