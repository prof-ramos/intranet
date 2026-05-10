import { describe, expect, test } from 'vitest';
import { envSchema } from './env';

describe('envSchema', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    SESSION_SECRET: 'a'.repeat(32),
    SKIP_AUTH: 'false',
    NODE_ENV: 'development',
  };

  test('aceita variáveis mínimas válidas', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  test('rejeita SESSION_SECRET menor que 32 caracteres', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SESSION_SECRET: 'short',
    });
    expect(result.success).toBe(false);
  });

  test('rejeita quando DATABASE_URL e DATABASE_POSTGRES_URL estão ausentes', () => {
    const result = envSchema.safeParse({
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes('DATABASE_URL'),
      );
      expect(issue?.message).toBe(
        'Either DATABASE_URL or DATABASE_POSTGRES_URL must be set.',
      );
    }
  });

  test('aceita DATABASE_POSTGRES_URL sem DATABASE_URL', () => {
    const result = envSchema.safeParse({
      DATABASE_POSTGRES_URL: 'postgres://user:pass@localhost:5432/db',
      SESSION_SECRET: 'a'.repeat(32),
    });
    expect(result.success).toBe(true);
  });

  test('rejeita SKIP_AUTH=true sem DEV_USER_ID fora de produção', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SKIP_AUTH: 'true',
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes('DEV_USER_ID'),
      );
      expect(issue?.message).toBe('DEV_USER_ID is required when SKIP_AUTH=true');
    }
  });

  test('aceita SKIP_AUTH=true com DEV_USER_ID em desenvolvimento', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SKIP_AUTH: 'true',
      NODE_ENV: 'development',
      DEV_USER_ID: '1',
    });
    expect(result.success).toBe(true);
  });

  test('aceita SKIP_AUTH=true sem DEV_USER_ID em produção', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SKIP_AUTH: 'true',
      NODE_ENV: 'production',
    });
    expect(result.success).toBe(true);
  });

  test('aplica defaults para SKIP_AUTH e DEV_USER_MUST_CHANGE_PASSWORD', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SKIP_AUTH).toBe('false');
      expect(result.data.DEV_USER_MUST_CHANGE_PASSWORD).toBe('false');
    }
  });
});
