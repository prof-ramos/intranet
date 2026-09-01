import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, destroySession, getSession } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/config';

let skipAuth = false;
let storedCookie: string | undefined;
let cookieOptions: Record<string, unknown> | undefined;
let mockDbUser: {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  isActive: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
} | null = null;

const cookieStore = {
  get: vi.fn((name: string) =>
    name === SESSION_COOKIE_NAME && storedCookie ? { value: storedCookie } : undefined,
  ),
  set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
    if (name === SESSION_COOKIE_NAME) {
      storedCookie = value;
      cookieOptions = options;
    }
  }),
  delete: vi.fn((name: string) => {
    if (name === SESSION_COOKIE_NAME) storedCookie = undefined;
  }),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(cookieStore)),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
  },
}));

vi.mock('@/lib/auth/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/config')>();
  return {
    ...actual,
    isSkipAuthEnabled: vi.fn(() => skipAuth),
    getDevAuthUser: vi.fn(() => ({
      userId: 1,
      name: 'Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
    })),
  };
});

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
  vi.unstubAllEnvs();
  skipAuth = false;
  storedCookie = undefined;
  cookieOptions = undefined;
  mockDbUser = null;
});

function mockActiveAdmin() {
  mockDbUser = {
    id: 7,
    name: 'Admin',
    email: 'admin@asof.local',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    sessionVersion: 0,
  };
}

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

  it('returns null without a local session cookie', async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  it('creates, reads, and destroys a signed local session', async () => {
    mockDbUser = {
      id: 7,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'diretoria',
      isActive: true,
      mustChangePassword: true,
      sessionVersion: 0,
    };

    await createSession({ userId: 7, email: 'admin@asof.local' });

    expect(storedCookie).toBeTruthy();
    await expect(getSession()).resolves.toEqual({
      userId: 7,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'diretoria',
      mustChangePassword: true,
      isLoggedIn: true,
    });

    await destroySession();
    expect(storedCookie).toBeUndefined();
  });

  it('sets the session cookie without Secure outside production runtime', async () => {
    mockActiveAdmin();

    await createSession({ userId: 7, email: 'admin@asof.local' });

    expect(cookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
  });

  it('sets the session cookie Secure when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockActiveAdmin();

    await createSession({ userId: 7, email: 'admin@asof.local' });

    expect(cookieOptions).toMatchObject({ secure: true });
  });

  it('sets the session cookie Secure when VERCEL_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('VERCEL_ENV', 'production');
    mockActiveAdmin();

    await createSession({ userId: 7, email: 'admin@asof.local' });

    expect(cookieOptions).toMatchObject({ secure: true });
  });

  it('returns null when the signed cookie maps to an inactive admin', async () => {
    mockDbUser = {
      id: 7,
      name: 'Inactive',
      email: 'admin@asof.local',
      role: 'admin',
      isActive: false,
      mustChangePassword: false,
      sessionVersion: 0,
    };

    await createSession({ userId: 7, email: 'admin@asof.local' });

    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when the signed cookie has an old session version', async () => {
    mockDbUser = {
      id: 7,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
      sessionVersion: 0,
    };

    await createSession({ userId: 7, email: 'admin@asof.local' });
    mockDbUser.sessionVersion = 1;

    await expect(getSession()).resolves.toBeNull();
  });
});
