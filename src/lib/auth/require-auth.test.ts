import { describe, expect, it, vi, beforeEach } from 'vitest';
import { requireAuth } from '@/lib/auth/require-auth';

let mockSession: import('@/lib/auth/config').SessionData | null = null;
let mockDbUser: { id: number; name: string; email: string; role: 'admin' | 'diretoria' | 'secretaria'; isActive: boolean; mustChangePassword: boolean } | null = null;
let skipAuth = false;

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

vi.mock('@/lib/auth/config', () => ({
  isSkipAuthEnabled: vi.fn(() => skipAuth),
  getDevAuthUser: vi.fn(() => ({
    userId: 1,
    name: 'Dev User',
    email: 'dev@asof.local',
    role: 'admin',
    mustChangePassword: false,
  })),
  SESSION_COOKIE_NAME: '__Host-asof-session',
  SESSION_COOKIE_MAX_AGE: 60 * 60 * 24 * 7,
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(mockDbUser ? [mockDbUser] : [])),
        })),
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSession = null;
  mockDbUser = null;
  skipAuth = false;
});

describe('requireAuth', () => {
  it('returns dev user when SKIP_AUTH is enabled', async () => {
    skipAuth = true;
    const user = await requireAuth();
    expect(user).toMatchObject({ userId: 1, name: 'Dev User', role: 'admin' });
  });

  it('redirects to login when no session exists', async () => {
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to login when session is not logged in', async () => {
    mockSession = { userId: 1, isLoggedIn: false, name: '', email: '', role: 'admin', mustChangePassword: false };
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to login when user is not found in database', async () => {
    mockSession = { userId: 999, isLoggedIn: true, name: '', email: '', role: 'admin', mustChangePassword: false };
    mockDbUser = null;
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to login when user is inactive', async () => {
    mockSession = { userId: 1, isLoggedIn: true, name: '', email: '', role: 'admin', mustChangePassword: false };
    mockDbUser = { id: 1, name: 'Test', email: 'test@asof.local', role: 'admin', isActive: false, mustChangePassword: false };
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('returns the authenticated user for a valid active session', async () => {
    mockSession = { userId: 1, isLoggedIn: true, name: '', email: '', role: 'admin', mustChangePassword: false };
    mockDbUser = { id: 1, name: 'Test User', email: 'test@asof.local', role: 'diretoria', isActive: true, mustChangePassword: true };
    const user = await requireAuth();
    expect(user).toMatchObject({
      userId: 1,
      name: 'Test User',
      email: 'test@asof.local',
      role: 'diretoria',
      mustChangePassword: true,
    });
  });
});
