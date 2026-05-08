import { describe, expect, it } from 'vitest';
import { getInitialAdminCredentials } from './seed-admin-config';

describe('initial admin credentials', () => {
  it('requires an explicit initial password', () => {
    expect(() => getInitialAdminCredentials({ INITIAL_ADMIN_EMAIL: 'admin@asof.org.br' }))
      .toThrow('INITIAL_ADMIN_PASSWORD must be set and at least 12 characters long.');
  });

  it('returns configured credentials when the password is strong enough', () => {
    expect(getInitialAdminCredentials({
      INITIAL_ADMIN_EMAIL: 'admin@asof.org.br',
      INITIAL_ADMIN_PASSWORD: 'Senha-Forte-2026!',
    })).toEqual({
      email: 'admin@asof.org.br',
      password: 'Senha-Forte-2026!',
    });
  });
});
