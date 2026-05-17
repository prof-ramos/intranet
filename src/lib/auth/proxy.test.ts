import { beforeEach, describe, expect, it, vi } from 'vitest';
import { proxy } from '@/proxy';

let skipAuth = false;
let mockUser: { email?: string | null } | null = null;
let mockGetUserError: Error | null = null;
const mockNext = vi.fn(() => ({ type: 'next' }));
const mockRedirect = vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() }));
const mockGetResponse = vi.fn(() => ({ type: 'response' }));

vi.mock('@/lib/auth/config', () => ({
  isSkipAuthEnabled: vi.fn(() => skipAuth),
}));

vi.mock('@/lib/supabase/proxy', () => ({
  createProxySupabaseClient: vi.fn(() => ({
    client: {
      auth: {
        getUser: vi.fn(() =>
          mockGetUserError
            ? Promise.reject(mockGetUserError)
            : Promise.resolve({ data: { user: mockUser } }),
        ),
      },
    },
    getResponse: mockGetResponse,
  })),
}));

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
      getAll: vi.fn(() => []),
      set: vi.fn(),
    },
  } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  skipAuth = false;
  mockUser = null;
  mockGetUserError = null;
});

describe('proxy', () => {
  it('allows requests immediately when SKIP_AUTH is enabled', async () => {
    skipAuth = true;

    await expect(proxy(createRequest('/app'))).resolves.toEqual({ type: 'next' });
    expect(mockGetResponse).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    await expect(proxy(createRequest('/app'))).resolves.toEqual({
      type: 'redirect',
      url: 'http://localhost:3000/login',
    });
  });

  it('redirects authenticated users away from /login', async () => {
    mockUser = { email: 'admin@asof.local' };

    await expect(proxy(createRequest('/login'))).resolves.toEqual({
      type: 'redirect',
      url: 'http://localhost:3000/app',
    });
  });

  it('returns the refreshed response for authenticated protected requests', async () => {
    mockUser = { email: 'admin@asof.local' };

    await expect(proxy(createRequest('/app/associados'))).resolves.toEqual({ type: 'response' });
    expect(mockGetResponse).toHaveBeenCalledOnce();
  });

  it('logs a safe warning when Supabase user lookup fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetUserError = Object.assign(new Error('token=secret'), { code: 'E_AUTH' });

    await expect(proxy(createRequest('/app'))).resolves.toEqual({
      type: 'redirect',
      url: 'http://localhost:3000/login',
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Auth proxy] Supabase user lookup failed.', {
      error: {
        kind: 'error',
        name: 'Error',
        code: 'E_AUTH',
        digest: undefined,
      },
    });
    consoleWarnSpy.mockRestore();
  });
});
