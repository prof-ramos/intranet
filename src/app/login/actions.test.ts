import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { login } from '@/app/login/actions';

let mockRateLimit = { allowed: true };
let mockConsumeError: Error | null = null;
let mockResetError: Error | null = null;
let mockPasswordMatches = true;
let mockDbUser: {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  isActive: boolean;
  mustChangePassword: boolean;
} | null = null;

const createSessionMock = vi.fn(async (input: unknown) => {
  void input;
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(() => Promise.resolve(mockPasswordMatches)),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: (input: unknown) => createSessionMock(input),
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

vi.mock('@/lib/auth/login-rate-limit', () => ({
  loginRateLimiter: {
    consume: vi.fn(() =>
      mockConsumeError ? Promise.reject(mockConsumeError) : Promise.resolve(mockRateLimit),
    ),
    reset: vi.fn(() => (mockResetError ? Promise.reject(mockResetError) : Promise.resolve())),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit = { allowed: true };
  mockConsumeError = null;
  mockResetError = null;
  mockPasswordMatches = true;
  mockDbUser = null;
});

function activeAdmin(overrides?: Partial<typeof mockDbUser>): NonNullable<typeof mockDbUser> {
  return {
    id: 1,
    name: 'Admin',
    email: 'admin@asof.local',
    passwordHash: 'stored-hash',
    role: 'admin',
    isActive: true,
    mustChangePassword: false,
    ...overrides,
  };
}

describe('login action', () => {
  it('redirects with error for missing email or password', async () => {
    const formData = new FormData();
    formData.set('email', '');
    formData.set('password', '');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
  });

  it('redirects with rate-limit error when rate limit is exceeded', async () => {
    mockRateLimit = { allowed: false };
    const formData = new FormData();
    formData.set('email', 'user@asof.local');
    formData.set('password', 'password');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=rate-limit');
  });

  it('redirects with error when no active admin matches the email/password', async () => {
    mockDbUser = activeAdmin({ isActive: false });
    const formData = new FormData();
    formData.set('email', 'inactive@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('redirects with error when bcrypt rejects the password', async () => {
    mockDbUser = activeAdmin();
    mockPasswordMatches = false;
    const formData = new FormData();
    formData.set('email', 'admin@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it('creates a local session and redirects to /app on successful login', async () => {
    mockDbUser = activeAdmin();
    const formData = new FormData();
    formData.set('email', 'admin@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/app');
    expect(createSessionMock).toHaveBeenCalledWith({ userId: 1, email: 'admin@asof.local' });
  });

  it('redirects to /change-password when the admin must rotate the password', async () => {
    mockDbUser = activeAdmin({ mustChangePassword: true });
    const formData = new FormData();
    formData.set('email', 'new@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/change-password');
  });

  it('logs a safe warning when the rate-limit check fails and allows login attempt to proceed', async () => {
    const consoleWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    mockDbUser = activeAdmin();
    mockConsumeError = Object.assign(new Error('email=user@example.com'), { code: 'E_RATE' });
    const formData = new FormData();
    formData.set('email', 'admin@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/app');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Login] Rate-limit check failed; allowing login attempt to proceed.',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_RATE',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleWarnSpy.mockRestore();
  });

  it('logs a safe warning when reset fails after successful login', async () => {
    const consoleWarnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    mockDbUser = activeAdmin();
    mockResetError = Object.assign(new Error('cpf=12345678901'), { code: 'E_RESET' });
    const formData = new FormData();
    formData.set('email', 'admin@asof.local');
    formData.set('password', 'Senha-Forte-2026!');

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/app');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Login] Rate-limit reset failed after successful login.',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_RESET',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleWarnSpy.mockRestore();
  });
});
