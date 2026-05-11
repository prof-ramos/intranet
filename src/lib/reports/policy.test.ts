import { describe, expect, it } from 'vitest';
import { canGenerateReports } from '@/lib/reports/policy';

describe('canGenerateReports', () => {
  it('allows admin and diretoria', () => {
    expect(canGenerateReports('admin')).toBe(true);
    expect(canGenerateReports('diretoria')).toBe(true);
  });

  it('blocks secretaria and unknown roles', () => {
    expect(canGenerateReports('secretaria')).toBe(false);
    expect(canGenerateReports('qualquer')).toBe(false);
  });
});
