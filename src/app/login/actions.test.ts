import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '@/app/login/actions';

let mockRateLimit = { allowed: true };
let mockDbUser:
  | {
      id: number;
      email: string;
      isActive: boolean;
      mustChangePassword: boolean;
    }
  | null = null;
let mockAuthUser: { email?: string | null } | null = null;
let mockSignInError: Error | null = null;
const mockSignOut = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
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

vi.mock('@/lib/auth/login-rate-limit', () => ({
  loginRateLimiter: {
    consume: vi.fn(() => Promise.resolve(mockRateLimit)),
    reset: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signInWithPassword: vi.fn(() =>
          Promise.resolve({
            data: { user: mockAuthUser },
            error: mockSignInError,
          }),
        ),
        signOut: mockSignOut,
      },
    }),
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit = { allowed: true };
  mockDbUser = null;
  mockAuthUser = null;
  mockSignInError = null;
});

describe('login action', () => {
  it('redirects with error for missing email or password', async () => {
    const formData = new FormData();
    formData.set('email', '');
    formData.set('password', '');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
  });

  it('redirects with rate-limit error when rate limit is exceeded', async () => {
    mockRateLimit = { allowed: false };
    const formData = new FormData();
    formData.set('email', 'user@asof.local');
    formData.set('password', 'password');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=rate-limit');
  });

  it('redirects with error when Supabase rejects the credentials', async () => {
    mockSignInError = new Error('invalid login');
    const formData = new FormData();
    formData.set('email', 'unknown@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
  });

  it('signs out and redirects with error when the authenticated email is not an active admin', async () => {
    mockAuthUser = { email: 'inactive@asof.local' };
    mockDbUser = {
      id: 1,
      email: 'inactive@asof.local',
      isActive: false,
      mustChangePassword: false,
    };
    const formData = new FormData();
    formData.set('email', 'inactive@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('redirects to /app on successful login', async () => {
    mockAuthUser = { email: 'admin@asof.local' };
    mockDbUser = {
      id: 1,
      email: 'admin@asof.local',
      isActive: true,
      mustChangePassword: false,
    };
    const formData = new FormData();
    formData.set('email', 'admin@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/app');
  });

  it('redirects to /change-password when the admin must rotate the password', async () => {
    mockAuthUser = { email: 'new@asof.local' };
    mockDbUser = {
      id: 1,
      email: 'new@asof.local',
      isActive: true,
      mustChangePassword: true,
    };
    const formData = new FormData();
    formData.set('email', 'new@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/change-password');
  });
});
