import { describe, expect, it, vi } from 'vitest';
import { canAccessRole, requireRole, isPrivilegedRole } from '@/lib/auth/authorization';
import { PRIVILEGED_ROLES } from '@/lib/auth/config';
import type { AuthRole } from '@/lib/auth/config';

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

describe('isPrivilegedRole', () => {
  it('returns true for admin', () => {
    expect(isPrivilegedRole('admin')).toBe(true);
  });

  it('returns true for diretoria', () => {
    expect(isPrivilegedRole('diretoria')).toBe(true);
  });

  it('returns false for secretaria', () => {
    expect(isPrivilegedRole('secretaria')).toBe(false);
  });

  it('PRIVILEGED_ROLES contains exactly admin and diretoria', () => {
    const roles: AuthRole[] = ['admin', 'diretoria', 'secretaria'];
    for (const role of roles) {
      expect(PRIVILEGED_ROLES.includes(role)).toBe(role === 'admin' || role === 'diretoria');
    }
  });
});
