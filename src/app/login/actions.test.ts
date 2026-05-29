import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticate = vi.fn();

vi.mock('@/lib/auth/service', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  InvalidCredentialsError: class InvalidCredentialsError extends Error {
    constructor() {
      super('Credenciais inválidas.');
      this.name = 'InvalidCredentialsError';
    }
  },
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(async () => ({})),
}));

const mockConsume = vi.fn(async () => ({ allowed: true }));
const mockReset = vi.fn(async () => ({}));

vi.mock('@/lib/auth/login-rate-limit', () => ({
  loginRateLimiter: {
    consume: mockConsume,
    reset: mockReset,
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('@/lib/validation/schemas', () => ({
  loginSchema: {
    safeParse: vi.fn(() => ({
      success: true,
      data: { email: 'admin@asof.local', password: 'Senha-Forte-2026!' },
    })),
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
    expect(redirect).toHaveBeenCalledWith('/app');
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

    expect(redirect).toHaveBeenCalledWith('/change-password');
  });

  it('redirects to rate-limit error when rate limit is exceeded', async () => {
    mockConsume.mockResolvedValueOnce({ allowed: false });
    const { login } = await import('@/app/login/actions');
    const { redirect } = await import('next/navigation');

    try {
      await login(buildForm());
    } catch {}

    expect(redirect).toHaveBeenCalledWith('/login?error=rate-limit');
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
      expect.objectContaining({ email: 'admin@asof.local' }),
      expect.any(Error),
    );
  });
});
