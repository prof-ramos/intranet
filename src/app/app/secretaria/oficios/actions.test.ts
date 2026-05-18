import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import {
  cancelOfficialLetterAction,
  generateAiTextAction,
  saveOfficialLetterAction,
  updateOfficialLetterAction,
} from './actions';

const requireRoleMock = vi.fn();
const findOfficialLettersMock = vi.fn();
const findOfficialLetterByIdMock = vi.fn();
const generateOfficialLetterContentMock = vi.fn();
const saveOfficialLetterMock = vi.fn();
const updateOfficialLetterMock = vi.fn();
const cancelOfficialLetterMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/oficios/repository', () => ({
  findOfficialLetters: (...args: unknown[]) => findOfficialLettersMock(...args),
  findOfficialLetterById: (...args: unknown[]) => findOfficialLetterByIdMock(...args),
}));

vi.mock('@/lib/oficios/service', () => ({
  saveOfficialLetter: (...args: unknown[]) => saveOfficialLetterMock(...args),
  updateOfficialLetter: (...args: unknown[]) => updateOfficialLetterMock(...args),
  cancelOfficialLetter: (...args: unknown[]) => cancelOfficialLetterMock(...args),
}));

vi.mock('@/lib/ai/gemini', () => ({
  generateOfficialLetterContent: (...args: unknown[]) => generateOfficialLetterContentMock(...args),
}));

vi.mock('@/lib/oficios/validations', () => ({
  officialLetterFormSchema: {
    parse: (value: unknown) => value,
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('secretaria oficios actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    findOfficialLettersMock.mockResolvedValue([]);
    findOfficialLetterByIdMock.mockResolvedValue(null);
    generateOfficialLetterContentMock.mockResolvedValue('texto gerado');
    saveOfficialLetterMock.mockResolvedValue({ id: 1 });
    updateOfficialLetterMock.mockResolvedValue({ id: 1 });
    cancelOfficialLetterMock.mockResolvedValue({ id: 1 });
  });

  it('returns AI suggestion on success', async () => {
    const result = await generateAiTextAction({
      recipient: 'Maria',
      recipientRole: 'Presidente',
      subject: 'Assunto',
      itamaratySector: 'SGP',
      instruction: 'Escreva um ofício',
    });

    expect(result).toEqual({ success: true, text: 'texto gerado' });
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
      expect.anything(),
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
      expect.anything(),
    );
    consoleErrorSpy.mockRestore();
  });
});
