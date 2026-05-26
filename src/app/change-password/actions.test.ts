import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { changePassword } from '@/app/change-password/actions';

const requireAuthMock = vi.fn();
const compareMock = vi.fn();
const hashMock = vi.fn();
const updateWhereMock = vi.fn();

let mockAdmin: {
  id: number;
  passwordHash: string;
} | null = null;

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: (...args: unknown[]) => compareMock(...args),
    hash: (...args: unknown[]) => hashMock(...args),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(mockAdmin ? [mockAdmin] : [])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: (...args: unknown[]) => updateWhereMock(...args),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  admins: {
    id: 'id',
    passwordHash: 'passwordHash',
  },
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
    mockAdmin = { id: 7, passwordHash: 'stored-hash' };
    compareMock.mockResolvedValue(true);
    hashMock.mockResolvedValue('new-hash');
    updateWhereMock.mockResolvedValue(undefined);
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
    await expect(changePassword(buildFormData())).rejects.toThrow('NEXT_REDIRECT:/app');

    expect(compareMock).toHaveBeenCalledWith('Senha-Atual-2026!', 'stored-hash');
    expect(hashMock).toHaveBeenCalledWith('Senha-Nova-2026!', 12);
  });

  it('redirects back with an error when the current password is invalid', async () => {
    compareMock.mockResolvedValueOnce(false);

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=Senha%20atual%20inv%C3%A1lida.',
    );

    expect(updateWhereMock).not.toHaveBeenCalled();
  });

  it('redirects with an error when the database write fails', async () => {
    updateWhereMock.mockRejectedValueOnce(new Error('write failed'));

    await expect(changePassword(buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/change-password?error=N%C3%A3o%20foi%20poss%C3%ADvel%20concluir%20a%20altera%C3%A7%C3%A3o%20de%20senha.',
    );
  });

  it('logs safe errors when the database write fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    updateWhereMock.mockRejectedValueOnce(
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
