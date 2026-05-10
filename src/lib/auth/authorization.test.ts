import { describe, expect, it, vi } from 'vitest';
import { canAccessRole, requireRole } from '@/lib/auth/authorization';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn(),
}));

describe('canAccessRole', () => {
  it('allows users with one of the required roles', () => {
    expect(canAccessRole('admin', ['admin', 'diretoria'])).toBe(true);
    expect(canAccessRole('diretoria', ['admin', 'diretoria'])).toBe(true);
  });

  it('rejects users outside the required roles', () => {
    expect(canAccessRole('secretaria', ['admin', 'diretoria'])).toBe(false);
  });
});

describe('requireRole', () => {
  it('returns user when role is allowed', async () => {
    const { requireAuth } = await import('@/lib/auth/require-auth');
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      mustChangePassword: false,
    });

    const user = await requireRole(['admin', 'diretoria']);
    expect(user.role).toBe('admin');
  });

  it('redirects to /app when role is not allowed', async () => {
    const { requireAuth } = await import('@/lib/auth/require-auth');
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 2,
      name: 'Secretaria',
      email: 'sec@asof.local',
      role: 'secretaria',
      mustChangePassword: false,
    });

    await expect(requireRole(['admin', 'diretoria'])).rejects.toThrow('NEXT_REDIRECT:/app');
  });
});
