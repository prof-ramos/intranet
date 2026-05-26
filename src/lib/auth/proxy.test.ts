import { beforeEach, describe, expect, it, vi } from 'vitest';
import { proxy } from '@/proxy';
import { SESSION_COOKIE_NAME } from '@/lib/auth/config';

let skipAuth = false;
let hasSession = false;
const mockNext = vi.fn(() => ({ type: 'next' }));
const mockRedirect = vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() }));

vi.mock('@/lib/auth/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/config')>();
  return {
    ...actual,
    isSkipAuthEnabled: vi.fn(() => skipAuth),
  };
});

vi.mock('next/server', () => ({
  NextResponse: {
    next: () => mockNext(),
    redirect: (url: URL) => mockRedirect(url),
  },
}));

function createRequest(pathname: string) {
  return {
    url: `http://localhost:3000${pathname}`,
    nextUrl: { pathname },
    cookies: {
      has: vi.fn((name: string) => name === SESSION_COOKIE_NAME && hasSession),
    },
  } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  skipAuth = false;
  hasSession = false;
});

describe('proxy', () => {
  it('allows requests immediately when SKIP_AUTH is enabled', async () => {
    skipAuth = true;

    await expect(proxy(createRequest('/app'))).resolves.toEqual({ type: 'next' });
  });

  it('redirects users without a local session away from protected routes', async () => {
    await expect(proxy(createRequest('/app'))).resolves.toEqual({
      type: 'redirect',
      url: 'http://localhost:3000/login',
    });
  });

  it('redirects users with a local session away from /login', async () => {
    hasSession = true;

    await expect(proxy(createRequest('/login'))).resolves.toEqual({
      type: 'redirect',
      url: 'http://localhost:3000/app',
    });
  });

  it('allows protected requests with a local session cookie', async () => {
    hasSession = true;

    await expect(proxy(createRequest('/app/associados'))).resolves.toEqual({ type: 'next' });
  });
});
