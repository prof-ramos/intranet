import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticate = vi.fn();
type MockLoginSchemaResult =
  | { success: true; data: { email: string; password: string } }
  | { success: false; error: { issues: Array<{ code: string; path: string[] }> } };

const mockSafeParse = vi.fn(
  (_: unknown): MockLoginSchemaResult => ({
    success: true,
    data: { email: 'admin@asof.local', password: 'Senha-Forte-2026!' },
  }),
);

vi.mock('@/lib/auth/service', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  InvalidCredentialsError: class InvalidCredentialsError extends Error {
    constructor() {
      super('Credenciais inválidas.');
      this.name = 'InvalidCredentialsError';
    }
  },
}));

const mockCreateSession = vi.fn(async () => ({}));

vi.mock('@/lib/auth/session', () => ({
  createSession: mockCreateSession,
}));

const mockConsume = vi.fn(async () => ({ allowed: true }));
const mockReset = vi.fn(async () => ({}));
const mockCleanup = vi.fn(async () => ({}));

vi.mock('@/lib/auth/login-rate-limit', () => ({
  loginRateLimiter: {
    consume: mockConsume,
    reset: mockReset,
    cleanup: mockCleanup,
  },
}));

const mockIpConsume = vi.fn((..._args: unknown[]) => ({ allowed: true }));
vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => mockIpConsume(...args),
}));

vi.mock('@/lib/ip', () => ({
  getTrustedClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Map()),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('@/lib/validation/schemas', () => ({
  loginSchema: {
    safeParse: (input: unknown) => mockSafeParse(input),
  },
}));

const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger,
}));

vi.mock('@/lib/error-log', () => ({
  toSafeErrorLog: vi.fn((e) => e),
  ensureError: vi.fn((e) => e),
}));

describe('login action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeParse.mockReturnValue({
      success: true,
      data: { email: 'admin@asof.local', password: 'Senha-Forte-2026!' },
    });
  });

  function buildForm() {
    const form = new FormData();
    form.set('email', 'admin@asof.local');
    form.set('password', 'Senha-Forte-2026!');
    return form;
  }

  it('authenticates and creates session on valid credentials', async () => {
    mockAuthenticate.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });

    const { login } = await import('@/app/login/actions');
    const { redirect } = await import('next/navigation');
    const { createSession } = await import('@/lib/auth/session');

    try {
      await login(buildForm());
    } catch {}

    expect(mockAuthenticate).toHaveBeenCalledWith('admin@asof.local', 'Senha-Forte-2026!');
    expect(createSession).toHaveBeenCalledWith({
      userId: 1,
      email: 'admin@asof.local',
    });
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/app');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('redirects to change-password when mustChangePassword is true', async () => {
    mockAuthenticate.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: true,
    });

    const { login } = await import('@/app/login/actions');
    const { redirect } = await import('next/navigation');

    try {
      await login(buildForm());
    } catch {}

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/change-password');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('creates the session and redirects after a rate-limit reset failure', async () => {
    mockAuthenticate.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });
    mockReset.mockRejectedValueOnce(new Error('reset unavailable'));

    const { login } = await import('@/app/login/actions');
    const { redirect } = await import('next/navigation');

    try {
      await login(buildForm());
    } catch {}

    expect(mockCreateSession).toHaveBeenCalledWith({
      userId: 1,
      email: 'admin@asof.local',
    });
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/app');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith('login_rate_limit_reset_failed');
  });

  it('redirects only to a generic error when session creation fails', async () => {
    mockAuthenticate.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    });
    mockCreateSession.mockRejectedValueOnce(new Error('session unavailable'));

    const { login } = await import('@/app/login/actions');
    const { redirect } = await import('next/navigation');

    try {
      await login(buildForm());
    } catch {}

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/login?error=1');
    expect(redirect).not.toHaveBeenCalledWith('/app');
    expect(redirect).not.toHaveBeenCalledWith('/change-password');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith('session_creation_failed');
  });

  it('redirects to rate-limit error when rate limit is exceeded', async () => {
    mockConsume.mockResolvedValueOnce({ allowed: false });
    const { login } = await import('@/app/login/actions');
    const { redirect } = await import('next/navigation');

    try {
      await login(buildForm());
    } catch {}

    expect(redirect).toHaveBeenCalledWith('/login?error=rate-limit');
    expect(mockLogger.warn).toHaveBeenCalledWith('[Login] Login rate limit exceeded', {
      reason: 'rate_limited',
    });
  });

  it('redirects to generic error and logs safe details on invalid form input', async () => {
    mockSafeParse.mockReturnValueOnce({
      success: false,
      error: {
        issues: [
          { code: 'invalid_string', path: ['email'] },
          { code: 'too_small', path: ['password'] },
        ],
      },
    });

    const { login } = await import('@/app/login/actions');
    const { redirect } = await import('next/navigation');

    try {
      await login(buildForm());
    } catch {}

    expect(redirect).toHaveBeenCalledWith('/login?error=1');
    expect(mockLogger.warn).toHaveBeenCalledWith('[Login] Invalid login form submission', {
      reason: 'validation_failed',
      issues: [
        { code: 'invalid_string', path: 'email' },
        { code: 'too_small', path: 'password' },
      ],
    });
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('redirects to error on authentication failure', async () => {
    const { InvalidCredentialsError } = await import('@/lib/auth/service');
    mockAuthenticate.mockRejectedValue(new InvalidCredentialsError());
    const { redirect } = await import('next/navigation');

    const { login } = await import('@/app/login/actions');

    const form = new FormData();
    form.set('email', 'admin@asof.local');
    form.set('password', 'wrong-password');

    try {
      await login(form);
    } catch {}

    expect(redirect).toHaveBeenCalledWith('/login?error=1');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[Login] Authentication failed',
      expect.objectContaining({ reason: 'invalid_credentials' }),
      expect.any(Error),
    );
  });

  it('redirects to generic error and logs safe details on unexpected authentication error', async () => {
    mockAuthenticate.mockRejectedValue(new Error('database unavailable'));
    const { redirect } = await import('next/navigation');

    const { login } = await import('@/app/login/actions');

    try {
      await login(buildForm());
    } catch {}

    expect(redirect).toHaveBeenCalledWith('/login?error=1');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[Login] Authentication error',
      expect.objectContaining({ reason: 'auth_error' }),
      expect.any(Error),
    );
  });
});
