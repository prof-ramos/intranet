import { describe, expect, it, vi, beforeEach } from 'vitest';
import { login } from '@/app/login/actions';

let mockRateLimit = { allowed: true };
let mockUser: { id: number; email: string; passwordHash: string; isActive: boolean; name: string; role: 'admin' | 'diretoria' | 'secretaria'; mustChangePassword: boolean } | null = null;
let sessionCreated = false;

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(() => {
    sessionCreated = true;
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(mockUser ? [mockUser] : [])),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/auth/login-rate-limit', () => ({
  loginRateLimiter: {
    consume: vi.fn(() => Promise.resolve(mockRateLimit)),
    reset: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit = { allowed: true };
  mockUser = null;
  sessionCreated = false;
});

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

  it('redirects with error for unknown user (timing-safe)', async () => {
    const formData = new FormData();
    formData.set('email', 'unknown@asof.local');
    formData.set('password', 'Senha-Forte-2026!');
    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
  });

  it('redirects with error for inactive user', async () => {
    mockUser = {
      id: 1,
      email: 'inactive@asof.local',
      passwordHash: '$2b$12$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu',
      isActive: false,
      name: 'Inactive',
      role: 'admin',
      mustChangePassword: false,
    };
    const formData = new FormData();
    formData.set('email', 'inactive@asof.local');
    formData.set('password', 'Senha-Forte-2026!');
    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
  });

  it('redirects with error for wrong password', async () => {
    mockUser = {
      id: 1,
      email: 'admin@asof.local',
      passwordHash: await (await import('bcryptjs')).hash('correct-password-2026!', 12),
      isActive: true,
      name: 'Admin',
      role: 'admin',
      mustChangePassword: false,
    };
    const formData = new FormData();
    formData.set('email', 'admin@asof.local');
    formData.set('password', 'wrong-password');
    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/login?error=1');
  });

  it('creates session and redirects to /app on successful login', async () => {
    const bcrypt = await import('bcryptjs');
    mockUser = {
      id: 1,
      email: 'admin@asof.local',
      passwordHash: await bcrypt.hash('Senha-Forte-2026!', 12),
      isActive: true,
      name: 'Admin',
      role: 'admin',
      mustChangePassword: false,
    };
    const formData = new FormData();
    formData.set('email', 'admin@asof.local');
    formData.set('password', 'Senha-Forte-2026!');
    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/app');
    expect(sessionCreated).toBe(true);
  });

  it('creates session and redirects to /app on successful login for user with mustChangePassword', async () => {
    const bcrypt = await import('bcryptjs');
    mockUser = {
      id: 1,
      email: 'new@asof.local',
      passwordHash: await bcrypt.hash('Senha-Forte-2026!', 12),
      isActive: true,
      name: 'New User',
      role: 'secretaria',
      mustChangePassword: true,
    };
    const formData = new FormData();
    formData.set('email', 'new@asof.local');
    formData.set('password', 'Senha-Forte-2026!');
    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT:/app');
    expect(sessionCreated).toBe(true);
  });
});
