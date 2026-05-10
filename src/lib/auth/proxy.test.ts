import { describe, expect, it, vi, beforeEach } from 'vitest';
import { proxy } from '@/proxy';
import { SESSION_COOKIE_NAME } from '@/lib/auth/config';

// Minimal mocks for Next.js request/response
function createMockRequest(token?: string) {
  return {
    url: 'http://localhost:3000/app/dashboard',
    cookies: {
      get: vi.fn((name: string) =>
        name === SESSION_COOKIE_NAME && token ? { value: token } : undefined
      ),
    },
  } as unknown as import('next/server').NextRequest;
}

const mockRedirect = vi.fn((url: URL) => ({ url: url.toString() }));
const mockNext = vi.fn(() => ({ type: 'next' }));

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => mockRedirect(url),
    next: () => mockNext(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('proxy', () => {
  it('redirects to login when no session cookie is present', async () => {
    const req = createMockRequest();
    await proxy(req);
    expect(mockRedirect).toHaveBeenCalledOnce();
    expect(mockRedirect.mock.calls[0][0].toString()).toBe('http://localhost:3000/login');
  });

  it('redirects to login for an invalid token', async () => {
    const req = createMockRequest('invalid-token');
    await proxy(req);
    expect(mockRedirect).toHaveBeenCalledOnce();
    expect(mockRedirect.mock.calls[0][0].toString()).toBe('http://localhost:3000/login');
  });

  it('allows the request when a valid token is present', async () => {
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode('a'.repeat(32));
    const token = await new SignJWT({ userId: 1, isLoggedIn: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    const req = createMockRequest(token);
    const result = await proxy(req);
    expect(mockNext).toHaveBeenCalledOnce();
    expect(result).toEqual({ type: 'next' });
  });

  it('allows the request when SKIP_AUTH is enabled', async () => {
    const originalSkip = process.env.SKIP_AUTH;
    process.env.SKIP_AUTH = 'true';

    const req = createMockRequest();
    const result = await proxy(req);
    expect(mockNext).toHaveBeenCalledOnce();
    expect(result).toEqual({ type: 'next' });

    process.env.SKIP_AUTH = originalSkip;
  });
});
