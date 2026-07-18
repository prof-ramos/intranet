import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { changePassword } from '@/app/change-password/actions';

const mockChangePasswordService = vi.fn();
const mockDestroySession = vi.fn();

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

vi.mock('@/lib/auth/session', () => ({
  destroySession: (...args: unknown[]) => mockDestroySession(...args),
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
    mockDestroySession.mockResolvedValue(undefined);
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

  it('destroys the current session and redirects to login after a successful password change', async () => {
    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/login?reset=success',
    );

    expect(mockChangePasswordService).toHaveBeenCalledWith(
      7,
      'Senha-Atual-2026!',
      'Senha-Nova-2026!',
    );
    expect(mockDestroySession).toHaveBeenCalledOnce();
  });

  it('still redirects to login when destroying the committed session cookie fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    mockDestroySession.mockRejectedValueOnce(
      Object.assign(new Error('cookie failed with private data'), { code: 'E_COOKIE' }),
    );
    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/login?reset=success',
    );

    expect(mockChangePasswordService).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[change-password] failed to destroy the rotated session cookie',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_COOKIE',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it('redirects back with an error when input validation fails', async () => {
    await expect(
      changePassword(buildFormData({ confirmPassword: 'Mismatched-Password!' })),
    ).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=A%20confirma%C3%A7%C3%A3o%20n%C3%A3o%20confere.',
    );
  });

  it('redirects back with an error when new password lacks required complexity', async () => {
    await expect(
      changePassword(buildFormData({ newPassword: 'password123', confirmPassword: 'password123' })),
    ).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=A%20senha%20deve%20conter%20pelo%20menos%20um%20n%C3%BAmero%20e%20um%20caractere%20especial.',
    );
  });

  it('redirects back with an error when the user session lacks an email', async () => {
    requireAuthMock.mockResolvedValue({
      userId: 7,
      role: 'admin',
      name: 'Admin',
      mustChangePassword: true,
      // email is missing
    });

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=Sess%C3%A3o%20inv%C3%A1lida.',
    );
  });

  it('redirects back with an error when the admin is not found in the database', async () => {
    const { AdminNotFoundError } = await import('@/lib/auth/service');
    mockChangePasswordService.mockRejectedValueOnce(new AdminNotFoundError());

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=Sess%C3%A3o%20inv%C3%A1lida.',
    );
  });

  it('redirects back with an error when the current password is invalid', async () => {
    const { InvalidCurrentPasswordError } = await import('@/lib/auth/service');
    mockChangePasswordService.mockRejectedValueOnce(new InvalidCurrentPasswordError());

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=Senha%20atual%20inv%C3%A1lida.',
    );
  });

  it('redirects with an error when the database write fails', async () => {
    mockChangePasswordService.mockRejectedValueOnce(new Error('write failed'));

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=N%C3%A3o%20foi%20poss%C3%ADvel%20concluir%20a%20altera%C3%A7%C3%A3o%20de%20senha.',
    );
  });

  it('logs safe errors when the database write fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    mockChangePasswordService.mockRejectedValueOnce(
      Object.assign(new Error('db failed cpf=123'), { code: 'E_DB' }),
    );

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
