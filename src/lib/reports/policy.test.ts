import { describe, expect, it } from 'vitest';
import { canGenerateReports } from '@/lib/reports/policy';
import type { AuthRole } from '@/lib/auth/config';

describe('canGenerateReports', () => {
  it('allows admin and diretoria', () => {
    expect(canGenerateReports('admin')).toBe(true);
    expect(canGenerateReports('diretoria')).toBe(true);
  });

  it('blocks secretaria', () => {
    expect(canGenerateReports('secretaria')).toBe(false);
  });

  it('blocks unknown roles at the type level', () => {
    // canGenerateReports only accepts AuthRole; invalid strings won't compile
    const roles: AuthRole[] = ['admin', 'diretoria', 'secretaria'];
    for (const role of roles) {
      if (role !== 'admin' && role !== 'diretoria') {
        expect(canGenerateReports(role)).toBe(false);
      }
    }
  });
});
