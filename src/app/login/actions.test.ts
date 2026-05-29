import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticate = vi.fn();

vi.mock('@/lib/auth/service', () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(async () => ({})),
}));

vi.mock('@/lib/auth/login-rate-limit', () => ({
  loginRateLimiter: {
    consume: vi.fn(async () => ({ allowed: true })),
    reset: vi.fn(async () => ({})),
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
    const { createSession } = await import('@/lib/auth/session');

    const form = new FormData();
    form.set('email', 'admin@asof.local');
    form.set('password', 'Senha-Forte-2026!');

    try {
      await login(form);
    } catch {}

    expect(mockAuthenticate).toHaveBeenCalledWith('admin@asof.local', 'Senha-Forte-2026!');
    expect(createSession).toHaveBeenCalledWith({
      userId: 1,
      email: 'admin@asof.local',
    });
  });

  it('redirects to error on authentication failure', async () => {
    mockAuthenticate.mockRejectedValue(new Error('Credenciais inválidas.'));
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
