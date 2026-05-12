import { beforeEach, describe, expect, it, vi } from 'vitest';
import { destroySession, getSession } from '@/lib/auth/session';

let skipAuth = false;
let mockAuthUser: { email?: string | null } | null = null;
let mockAuthError: Error | null = null;
let mockSignOutError: Error | null = null;
let mockDbUser:
  | {
      id: number;
      name: string;
      email: string;
      role: 'admin' | 'diretoria' | 'secretaria';
      isActive: boolean;
      mustChangePassword: boolean;
    }
  | null = null;

vi.mock('@/lib/auth/config', () => ({
  isSkipAuthEnabled: vi.fn(() => skipAuth),
  isAuthRole: vi.fn((value: string | undefined) =>
    value === 'admin' || value === 'diretoria' || value === 'secretaria',
  ),
  getDevAuthUser: vi.fn(() => ({
    userId: 1,
    name: 'Dev User',
    email: 'dev@asof.local',
    role: 'admin',
    mustChangePassword: false,
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: mockAuthUser },
            error: mockAuthError,
          }),
        ),
        signOut: vi.fn(() => Promise.resolve({ error: mockSignOutError })),
      },
    }),
  ),
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
  skipAuth = false;
  mockAuthUser = null;
  mockAuthError = null;
  mockSignOutError = null;
  mockDbUser = null;
});

describe('session', () => {
  it('returns the development user when SKIP_AUTH is enabled', async () => {
    skipAuth = true;

    await expect(getSession()).resolves.toEqual({
      userId: 1,
      name: 'Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    });
  });

  it('returns null when Supabase has no authenticated user', async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when Supabase returns an auth error', async () => {
    mockAuthError = new Error('token expired');
    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when the authenticated user is not present in admins', async () => {
    mockAuthUser = { email: 'missing@asof.local' };
    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when the mapped admin is inactive', async () => {
    mockAuthUser = { email: 'inactive@asof.local' };
    mockDbUser = {
      id: 2,
      name: 'Inactive',
      email: 'inactive@asof.local',
      role: 'secretaria',
      isActive: false,
      mustChangePassword: false,
    };

    await expect(getSession()).resolves.toBeNull();
  });

  it('returns the mapped admin session for an authenticated Supabase user', async () => {
    mockAuthUser = { email: 'admin@asof.local' };
    mockDbUser = {
      id: 7,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'diretoria',
      isActive: true,
      mustChangePassword: true,
    };

    await expect(getSession()).resolves.toEqual({
      userId: 7,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'diretoria',
      mustChangePassword: true,
      isLoggedIn: true,
    });
  });

  it('signs out through Supabase when destroying the session', async () => {
    await expect(destroySession()).resolves.toBeUndefined();
  });

  it('bubbles up Supabase sign-out errors', async () => {
    mockSignOutError = new Error('boom');
    await expect(destroySession()).rejects.toThrow('boom');
  });
});
