import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import { createSession, getSession, destroySession, updateSession } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME } from '@/lib/auth/config';

// Mock next/headers cookies
let storedToken: string | null = null;

const mockCookieStore = {
  get: vi.fn(() => (storedToken ? { value: storedToken } : undefined)),
  set: vi.fn((_name: string, value: string) => {
    storedToken = value;
  }),
  delete: vi.fn(() => {
    storedToken = null;
  }),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const secret = 'a'.repeat(32);
const payload = {
  userId: 1,
  name: 'Test User',
  email: 'test@asof.local',
  role: 'admin' as const,
  mustChangePassword: false,
  isLoggedIn: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  storedToken = null;
});

describe('session', () => {
  it('creates a session cookie with correct attributes', async () => {
    await createSession(payload);

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE_NAME);
    expect(token).toBeTruthy();
    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      partitioned: true,
    });
    expect(options.maxAge).toBe(60 * 60 * 24 * 7);
  });

  it('returns session data for a valid token', async () => {
    const token = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(secret));

    storedToken = token;

    const session = await getSession();
    expect(session).toMatchObject(payload);
  });

  it('returns null when no cookie exists', async () => {
    storedToken = null;
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('returns null for an invalid token', async () => {
    storedToken = 'invalid-token';
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('destroys the session cookie', async () => {
    await destroySession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it('updates session with new values', async () => {
    const token = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(secret));

    storedToken = token;

    await updateSession({ mustChangePassword: true });

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const updatedSession = await getSession();
    expect(updatedSession).toMatchObject({ ...payload, mustChangePassword: true });
  });

  it('does nothing when updating without an existing session', async () => {
    storedToken = null;
    await updateSession({ mustChangePassword: true });
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });
});
