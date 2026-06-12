import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteGeminiApiKeyAction, saveGeminiApiKeyAction } from './actions';

const requireRoleMock = vi.fn();
const upsertGeminiApiKeyMock = vi.fn();
const deleteGeminiApiKeyMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/ai/settings', () => ({
  upsertGeminiApiKey: (...args: unknown[]) => upsertGeminiApiKeyMock(...args),
  deleteGeminiApiKey: (...args: unknown[]) => deleteGeminiApiKeyMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('config integracoes IA actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    upsertGeminiApiKeyMock.mockResolvedValue(undefined);
    deleteGeminiApiKeyMock.mockResolvedValue(undefined);
  });

  it('normalizes and saves a Gemini API key', async () => {
    const formData = new FormData();
    formData.set('apiKey', '  AIzaValidKey  ');

    const result = await saveGeminiApiKeyAction(null, formData);

    expect(result).toEqual({ success: true, message: 'Chave da API Gemini salva com sucesso.' });
    expect(upsertGeminiApiKeyMock).toHaveBeenCalledWith('AIzaValidKey', 7);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes/ia');
  });

  it('preserves product validation for an invalid Gemini API key', async () => {
    const formData = new FormData();
    formData.set('apiKey', 'invalid');

    const result = await saveGeminiApiKeyAction(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Chave inválida. Chaves Gemini começam com "AIza".',
    });
    expect(upsertGeminiApiKeyMock).not.toHaveBeenCalled();
  });

  it('rejects a non-string API key at the form boundary', async () => {
    const formData = new FormData();
    formData.set('apiKey', new File(['secret'], 'key.txt'));

    const result = await saveGeminiApiKeyAction(null, formData);

    expect(result.success).toBe(false);
    expect(upsertGeminiApiKeyMock).not.toHaveBeenCalled();
  });

  it('deletes the stored Gemini API key from an empty form', async () => {
    const result = await deleteGeminiApiKeyAction(null, new FormData());

    expect(result).toEqual({ success: true, message: 'Chave da API Gemini removida.' });
    expect(deleteGeminiApiKeyMock).toHaveBeenCalledWith(7);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes/ia');
  });
});
