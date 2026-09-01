import { describe, expect, it } from 'vitest';
import { getDevAuthUser, isProductionRuntime, isSkipAuthEnabled } from '@/lib/auth/config';

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

  it('rejects non-decimal development user ids', () => {
    expect(() => getDevAuthUser({ SKIP_AUTH: 'true', DEV_USER_ID: '1e2' })).toThrow(
      'DEV_USER_ID must be a positive integer when SKIP_AUTH=true.',
    );
    expect(() => getDevAuthUser({ SKIP_AUTH: 'true', DEV_USER_ID: '0x10' })).toThrow(
      'DEV_USER_ID must be a positive integer when SKIP_AUTH=true.',
    );
  });

  it('ignores auth bypass in production (NODE_ENV)', () => {
    expect(isSkipAuthEnabled({ SKIP_AUTH: 'true', NODE_ENV: 'production' })).toBe(false);
  });

  it('ignores auth bypass in production (VERCEL_ENV)', () => {
    expect(isSkipAuthEnabled({ SKIP_AUTH: 'true', VERCEL_ENV: 'production' })).toBe(false);
  });

  it('treats NODE_ENV or VERCEL_ENV production as production runtime', () => {
    expect(isProductionRuntime({ NODE_ENV: 'production' })).toBe(true);
    expect(isProductionRuntime({ VERCEL_ENV: 'production' })).toBe(true);
    expect(isProductionRuntime({ NODE_ENV: 'test', VERCEL_ENV: 'preview' })).toBe(false);
  });
});
