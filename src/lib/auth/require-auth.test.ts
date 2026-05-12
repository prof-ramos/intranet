import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/lib/auth/require-auth';

let mockSession: import('@/lib/auth/config').SessionData | null = null;

vi.mock('react', () => ({ cache: (fn: unknown) => fn }));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    const err = new Error(`NEXT_REDIRECT:${path}`);
    (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${path};307`;
    throw err;
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSession = null;
});

describe('requireAuth', () => {
  it('redirects to login when there is no session', async () => {
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to login when the session is not logged in', async () => {
    mockSession = {
      userId: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: false,
    };

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('returns the authenticated user from the session payload', async () => {
    mockSession = {
      userId: 7,
      name: 'Diretoria',
      email: 'dir@asof.local',
      role: 'diretoria',
      mustChangePassword: true,
      isLoggedIn: true,
    };

    await expect(requireAuth()).resolves.toEqual({
      userId: 7,
      name: 'Diretoria',
      email: 'dir@asof.local',
      role: 'diretoria',
      mustChangePassword: true,
    });
  });
});
