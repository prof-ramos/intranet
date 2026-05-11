import { describe, expect, it } from 'vitest';
import { isPrivilegedRole, PRIVILEGED_ROLES } from '@/lib/auth/permissions';
import type { AuthRole } from '@/lib/auth/config';

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