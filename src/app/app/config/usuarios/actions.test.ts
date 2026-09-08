import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetUserPassword, toggleUserActive } from './actions';
import { temporaryPasswordEmailHtml } from '@/lib/email/templates';

const { requireRoleMock, resetPasswordMock, toggleAdminActiveMock, revalidatePathMock } =
  vi.hoisted(() => ({
    requireRoleMock: vi.fn(),
    resetPasswordMock: vi.fn(),
    toggleAdminActiveMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock('@/lib/auth/service', () => ({
  resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
  toggleAdminActive: (...args: unknown[]) => toggleAdminActiveMock(...args),
  AdminNotFoundError: class AdminNotFoundError extends Error {
    constructor() {
      super('Admin não encontrado.');
      this.name = 'AdminNotFoundError';
    }
  },
  InactiveAdminError: class InactiveAdminError extends Error {
    constructor() {
      super('Conta desativada.');
      this.name = 'InactiveAdminError';
    }
  },
  EmailDeliveryNotConfiguredError: class EmailDeliveryNotConfiguredError extends Error {
    constructor() {
      super('Envio de e-mail não configurado. Não é possível resetar a senha.');
      this.name = 'EmailDeliveryNotConfiguredError';
    }
  },
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('config usuarios actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    resetPasswordMock.mockResolvedValue({ emailDelivered: true });
    toggleAdminActiveMock.mockResolvedValue({ name: 'Carlos', isActive: true });
  });

  it('reports email delivery success without returning a password', async () => {
    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Senha temporária gerada e enviada ao usuário.',
    });
    expect(result).not.toHaveProperty('tempPassword');
    expect(resetPasswordMock).toHaveBeenCalledWith(10, 7);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/usuarios');
  });

  it('reports email delivery failure without returning a password', async () => {
    resetPasswordMock.mockResolvedValue({ emailDelivered: false });

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Não foi possível enviar o e-mail de redefinição. Tente novamente.',
    });
    expect(result).not.toHaveProperty('tempPassword');
  });

  it('rejects password reset when Mailjet is unconfigured', async () => {
    const { EmailDeliveryNotConfiguredError } = await import('@/lib/auth/service');
    resetPasswordMock.mockRejectedValueOnce(new EmailDeliveryNotConfiguredError());

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Envio de e-mail não configurado. Não é possível resetar a senha.',
    });
    expect(result).not.toHaveProperty('tempPassword');
  });

  it('rejects password reset for the current actor', async () => {
    const formData = new FormData();
    formData.set('userId', '7');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Use a página de troca de senha para alterar sua própria senha.',
    });
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('rejects non-decimal user ids before password reset or toggle', async () => {
    const resetFormData = new FormData();
    resetFormData.set('userId', '1e2');

    await expect(resetUserPassword(null, resetFormData)).resolves.toEqual({
      success: false,
      message: 'Usuário inválido.',
    });

    const toggleFormData = new FormData();
    toggleFormData.set('userId', '0x10');

    await expect(toggleUserActive(null, toggleFormData)).resolves.toEqual({
      success: false,
      message: 'Usuário inválido.',
    });

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(toggleAdminActiveMock).not.toHaveBeenCalled();
  });

  it('returns a fixed Portuguese error instead of driver messages', async () => {
    resetPasswordMock.mockRejectedValueOnce(new Error('ECONNRESET from postgres'));

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Falha ao resetar senha.',
    });
    expect(result).not.toHaveProperty('tempPassword');
  });

  it('rejects password reset for inactive users', async () => {
    const { InactiveAdminError } = await import('@/lib/auth/service');
    resetPasswordMock.mockRejectedValueOnce(new InactiveAdminError());

    const formData = new FormData();
    formData.set('userId', '11');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Não é possível resetar a senha de um usuário inativo.',
    });
  });

  it('rejects toggling the current actor account', async () => {
    const formData = new FormData();
    formData.set('userId', '7');

    const result = await toggleUserActive(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Não é possível desativar sua própria conta.',
    });
    expect(toggleAdminActiveMock).not.toHaveBeenCalled();
  });

  it('toggles a target user active flag, audits, and revalidates', async () => {
    toggleAdminActiveMock.mockResolvedValue({ name: 'Carlos', isActive: true });

    const formData = new FormData();
    formData.set('userId', '12');

    const result = await toggleUserActive(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Usuário Carlos foi ativado com sucesso.',
    });
    expect(toggleAdminActiveMock).toHaveBeenCalledWith(12, 7);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/usuarios');
  });

  it('reports user not found when toggling a nonexistent user', async () => {
    const { AdminNotFoundError } = await import('@/lib/auth/service');
    toggleAdminActiveMock.mockRejectedValueOnce(new AdminNotFoundError());

    const formData = new FormData();
    formData.set('userId', '999');

    const result = await toggleUserActive(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Usuário não encontrado.',
    });
  });

  it('escapes temporary password in email HTML', () => {
    const html = temporaryPasswordEmailHtml('Maria', 'Temp<"abc">&');

    expect(html).toContain('Temp&lt;&quot;abc&quot;&gt;&amp;');
    expect(html).not.toContain('Temp<"abc">&');
  });
});
