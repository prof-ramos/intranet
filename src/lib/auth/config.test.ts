import { describe, expect, it } from 'vitest';
import { getDevAuthUser, isSkipAuthEnabled } from '@/lib/auth/config';

describe('auth config', () => {
  it('reads the development user from env when skip auth is enabled', () => {
    const env = {
      SKIP_AUTH: 'true',
      DEV_USER_ID: '42',
      DEV_USER_NAME: 'Usuário Dev',
      DEV_USER_EMAIL: 'dev@asof.org.br',
      DEV_USER_ROLE: 'diretoria',
      DEV_USER_MUST_CHANGE_PASSWORD: 'true',
    };

    expect(isSkipAuthEnabled(env)).toBe(true);
    expect(getDevAuthUser(env)).toEqual({
      userId: 42,
      name: 'Usuário Dev',
      email: 'dev@asof.org.br',
      role: 'diretoria',
      mustChangePassword: true,
    });
  });

  it('uses explicit development defaults for missing optional dev user fields', () => {
    expect(getDevAuthUser({ SKIP_AUTH: 'true' })).toEqual({
      userId: 1,
      name: 'ASOF Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
    });
  });

  it('rejects invalid development roles with a clear error', () => {
    expect(() => getDevAuthUser({ SKIP_AUTH: 'true', DEV_USER_ROLE: 'root' })).toThrow(
      'DEV_USER_ROLE must be one of: admin, diretoria, secretaria.',
    );
  });

  it('ignores auth bypass in production', () => {
    expect(isSkipAuthEnabled({ SKIP_AUTH: 'true', NODE_ENV: 'production' })).toBe(false);
  });
});
