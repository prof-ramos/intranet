import { describe, expect, it } from 'vitest';
import { getRoleLabel, ROLE_LABELS } from '@/lib/ui/role-labels';
import type { AuthRole } from '@/lib/auth/config';

describe('getRoleLabel', () => {
  it('returns label for admin', () => {
    expect(getRoleLabel('admin')).toBe('Coordenador');
  });

  it('returns label for diretoria', () => {
    expect(getRoleLabel('diretoria')).toBe('Diretoria');
  });

  it('returns label for secretaria', () => {
    expect(getRoleLabel('secretaria')).toBe('Secretaria');
  });

  it('ROLE_LABELS has entries for all AuthRoles', () => {
    const roles: AuthRole[] = ['admin', 'diretoria', 'secretaria'];
    for (const role of roles) {
      expect(ROLE_LABELS[role]).toBeDefined();
    }
  });
});
