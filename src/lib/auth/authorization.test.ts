import { describe, expect, it } from 'vitest';
import { canAccessRole } from './authorization';

describe('authorization', () => {
  it('allows users with one of the required roles', () => {
    expect(canAccessRole('admin', ['admin', 'diretoria'])).toBe(true);
    expect(canAccessRole('diretoria', ['admin', 'diretoria'])).toBe(true);
  });

  it('rejects users outside the required roles', () => {
    expect(canAccessRole('secretaria', ['admin', 'diretoria'])).toBe(false);
  });
});
