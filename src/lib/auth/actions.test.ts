import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { logout } from './actions';

const destroySessionMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  destroySession: (...args: unknown[]) => destroySessionMock(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

describe('auth actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destroySessionMock.mockResolvedValue(undefined);
  });

  it('redirects to login after successful logout', async () => {
    await expect(logout()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('logs a safe error when logout fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    destroySessionMock.mockRejectedValue(
      Object.assign(new Error('token=secret'), { code: 'E_SIGNOUT' }),
    );

    await expect(logout()).rejects.toThrow('Falha ao encerrar sessão.');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth] failed to destroy session during logout',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_SIGNOUT',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
