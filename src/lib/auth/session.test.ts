import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession, destroySession, getSession } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/config';

let skipAuth = false;
let storedCookie: string | undefined;
let mockDbUser: {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  isActive: boolean;
  mustChangePassword: boolean;
} | null = null;

const cookieStore = {
  get: vi.fn((name: string) =>
    name === SESSION_COOKIE_NAME && storedCookie ? { value: storedCookie } : undefined,
  ),
  set: vi.fn((name: string, value: string) => {
    if (name === SESSION_COOKIE_NAME) storedCookie = value;
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
  skipAuth = false;
  storedCookie = undefined;
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

  it('returns null when the signed cookie maps to an inactive admin', async () => {
    mockDbUser = {
      id: 7,
      name: 'Inactive',
      email: 'admin@asof.local',
      role: 'admin',
      isActive: false,
      mustChangePassword: false,
    };

    await createSession({ userId: 7, email: 'admin@asof.local' });

    await expect(getSession()).resolves.toBeNull();
  });
});
