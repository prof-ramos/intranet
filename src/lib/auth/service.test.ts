import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@asof.local',
  passwordHash: 'stored-hash',
  role: 'admin',
  isActive: true,
  mustChangePassword: false,
};

vi.mock('@/lib/db/retry', () => ({
  retryTransientConnection: (fn: () => Promise<unknown>) => fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [mockDbUser]),
        })),
      })),
    })),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(async () => true),
  },
}));

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns authenticated user on valid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    vi.mocked(bcrypt.default.compare).mockResolvedValue(true as never);

    const { authenticate } = await import('@/lib/auth/service');

    const user = await authenticate('admin@asof.local', 'Senha-Forte-2026!');

    expect(user.id).toBe(1);
    expect(user.email).toBe('admin@asof.local');
    expect(user.role).toBe('admin');
  });

  it('rejects invalid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    vi.mocked(bcrypt.default.compare).mockResolvedValue(false as never);

    const { authenticate } = await import('@/lib/auth/service');

    await expect(
      authenticate('admin@asof.local', 'wrong-password'),
    ).rejects.toThrow('Credenciais inválidas.');
  });

  it('rejects inactive user', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ ...mockDbUser, isActive: false }]),
        })),
      })),
    } as never);

    const { authenticate } = await import('@/lib/auth/service');

    await expect(
      authenticate('admin@asof.local', 'Senha-Forte-2026!'),
    ).rejects.toThrow('Credenciais inválidas.');
  });

  it('rejects non-existent user with same error as wrong password', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    } as never);

    const { authenticate } = await import('@/lib/auth/service');

    await expect(
      authenticate('nobody@asof.local', 'Senha-Forte-2026!'),
    ).rejects.toThrow('Credenciais inválidas.');
  });
});


