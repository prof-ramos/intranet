import { describe, expect, test } from 'vitest';
import { envSchema } from './env';

describe('envSchema', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    SKIP_AUTH: 'false',
    SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
    NODE_ENV: 'development',
  };

  test('aceita variáveis mínimas válidas', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  test('rejeita quando DATABASE_URL e DATABASE_POSTGRES_URL estão ausentes', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('DATABASE_URL'));
      expect(issue?.message).toBe(
        'Either DATABASE_URL, DATABASE_POSTGRES_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL must be set.',
      );
    }
  });

  test('aceita DATABASE_POSTGRES_URL sem DATABASE_URL', () => {
    const result = envSchema.safeParse({
      DATABASE_POSTGRES_URL: 'postgres://user:pass@localhost:5432/db',
      SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
    });
    expect(result.success).toBe(true);
  });

  test('trata DATABASE_URL vazia como ausente e usa fallback valido', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: '',
      DATABASE_POSTGRES_URL: 'postgres://user:pass@localhost:5432/db',
      SKIP_AUTH: 'false',
      SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
      NODE_ENV: 'production',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBeUndefined();
      expect(result.data.DATABASE_POSTGRES_URL).toBe('postgres://user:pass@localhost:5432/db');
    }
  });

  test('rejeita SKIP_AUTH=true sem DEV_USER_ID fora de produção', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      SKIP_AUTH: 'true',
      NODE_ENV: 'development',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('DEV_USER_ID'));
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

  test('aceita produção sem Mailjet configurado', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      DATABASE_MIGRATION_URL: 'postgres://user:pass@localhost:5432/db',
      SKIP_AUTH: 'false',
      SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      CRON_SECRET: 'cron-secret-configurado',
      ASOF_INTRANET_URL: 'https://intranet.asof.com.br',
      ENCRYPTION_MASTER_KEY: 'test-encryption-master-key-with-at-least-32-chars',
    });

    expect(result.success).toBe(true);
  });

  test('rejeita producao Vercel sem DATABASE_MIGRATION_URL explicita', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      VERCEL_ENV: 'production',
      CRON_SECRET: 'cron-secret-configurado',
      ASOF_INTRANET_URL: 'https://intranet.asof.com.br',
      ENCRYPTION_MASTER_KEY: 'test-encryption-master-key-with-at-least-32-chars',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('DATABASE_MIGRATION_URL'));
      expect(issue?.message).toBe(
        'Production must set explicit DATABASE_URL and DATABASE_MIGRATION_URL; legacy provider fallbacks are not allowed as the production database contract.',
      );
    }
  });

  test('aceita variaveis de banco injetadas pela Vercel quando o par oficial existe', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_MIGRATION_URL: 'postgres://user:pass@localhost:5432/db',
      DATABASE_POSTGRES_URL: 'postgres://user:pass@localhost:5432/legacy',
      VERCEL_ENV: 'production',
      CRON_SECRET: 'cron-secret-configurado',
      ASOF_INTRANET_URL: 'https://intranet.asof.com.br',
      ENCRYPTION_MASTER_KEY: 'test-encryption-master-key-with-at-least-32-chars',
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

  test('aplica remetente Mailjet validado por padrão', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.MAILJET_SENDER_EMAIL).toBe('gabriel@asof.org.br');
      expect(result.data.MAILJET_SENDER_NAME).toBe('ASOF Intranet');
      expect(result.data.MAILJET_SENDER_VALIDATED).toBe(false);
    }
  });

  test('aceita URL publica da intranet e flag de remetente validado', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      ASOF_INTRANET_URL: 'https://intranet.asof.com.br',
      MAILJET_SENDER_VALIDATED: 'true',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ASOF_INTRANET_URL).toBe('https://intranet.asof.com.br');
      expect(result.data.MAILJET_SENDER_VALIDATED).toBe(true);
    }
  });

  test('rejeita producao Vercel sem URL publica da intranet', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      VERCEL_ENV: 'production',
      CRON_SECRET: 'cron-secret-configurado',
      ENCRYPTION_MASTER_KEY: 'test-encryption-master-key-with-at-least-32-chars',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('ASOF_INTRANET_URL'));
      expect(issue?.message).toBe('ASOF_INTRANET_URL is required for production app links.');
    }
  });

  test('rejeita producao Vercel sem chave de criptografia de PII', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      DATABASE_MIGRATION_URL: 'postgres://user:pass@localhost:5432/db',
      SKIP_AUTH: 'false',
      SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
      CRON_SECRET: 'cron-secret-configurado',
      ASOF_INTRANET_URL: 'https://intranet.asof.com.br',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('ENCRYPTION_MASTER_KEY'));
      expect(issue?.message).toBe('ENCRYPTION_MASTER_KEY is required for production PII encryption.');
    }
  });
});
