import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';

const mockChangePasswordService = vi.fn();

vi.mock('@/lib/auth/service', () => ({
  changePassword: (...args: unknown[]) => mockChangePasswordService(...args),
  InvalidCurrentPasswordError: class InvalidCurrentPasswordError extends Error {
    constructor() {
      super('Senha atual inválida.');
      this.name = 'InvalidCurrentPasswordError';
    }
  },
  AdminNotFoundError: class AdminNotFoundError extends Error {
    constructor() {
      super('Admin não encontrado.');
      this.name = 'AdminNotFoundError';
    }
  },
}));

const requireAuthMock = vi.fn();

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

describe('change password action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({
      userId: 7,
      email: 'admin@asof.local',
      role: 'admin',
      name: 'Admin',
      mustChangePassword: true,
    });
    mockChangePasswordService.mockResolvedValue(undefined);
  });

  function buildFormData(
    overrides?: Partial<Record<'currentPassword' | 'newPassword' | 'confirmPassword', string>>,
  ) {
    const formData = new FormData();
    formData.set('currentPassword', overrides?.currentPassword ?? 'Senha-Atual-2026!');
    formData.set('newPassword', overrides?.newPassword ?? 'Senha-Nova-2026!');
    formData.set('confirmPassword', overrides?.confirmPassword ?? 'Senha-Nova-2026!');
    return formData;
  }

  it('redirects to /app after a successful password change', async () => {
    const { changePassword } = await import('@/app/change-password/actions');

    await expect(changePassword(buildFormData())).rejects.toThrow('NEXT_REDIRECT:/app');

    expect(mockChangePasswordService).toHaveBeenCalledWith(7, 'Senha-Atual-2026!', 'Senha-Nova-2026!');
  });

  it('redirects back with an error when the current password is invalid', async () => {
    const { InvalidCurrentPasswordError } = await import('@/lib/auth/service');
    mockChangePasswordService.mockRejectedValueOnce(new InvalidCurrentPasswordError());

    const { changePassword } = await import('@/app/change-password/actions');

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=Senha%20atual%20inv%C3%A1lida.',
    );
  });

  it('redirects with an error when the database write fails', async () => {
    mockChangePasswordService.mockRejectedValueOnce(new Error('write failed'));

    const { changePassword } = await import('@/app/change-password/actions');

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=N%C3%A3o%20foi%20poss%C3%ADvel%20concluir%20a%20altera%C3%A7%C3%A3o%20de%20senha.',
    );
  });

  it('logs safe errors when the database write fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    mockChangePasswordService.mockRejectedValueOnce(
      Object.assign(new Error('db failed cpf=123'), { code: 'E_DB' }),
    );

    const { changePassword } = await import('@/app/change-password/actions');

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=N%C3%A3o%20foi%20poss%C3%ADvel%20concluir%20a%20altera%C3%A7%C3%A3o%20de%20senha.',
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[change-password] failed to persist new password hash',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_DB',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
