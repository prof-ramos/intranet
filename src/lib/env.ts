import { z } from 'zod';

const emptyToUndefined = (v: string | undefined) => (v === '' ? undefined : v);
const optionalString         = z.string().optional().transform(emptyToUndefined);
const optionalNonEmptyString = z.string().optional().transform(emptyToUndefined);
const optionalSecretString   = z.string().optional().transform(emptyToUndefined);
const optionalUrl            = z.string().optional().transform(emptyToUndefined).pipe(z.string().url().optional());
const optionalBooleanString  = z.string().optional().transform(emptyToUndefined).pipe(z.enum(['true', 'false']).optional());

export const envSchema = z
  .object({
    DATABASE_URL: optionalUrl,
    DATABASE_MIGRATION_URL: optionalUrl,
    DATABASE_URL_UNPOOLED: optionalUrl,
    DATABASE_POSTGRES_URL: optionalUrl,
    POSTGRES_URL: optionalUrl,
    POSTGRES_PRISMA_URL: optionalUrl,
    POSTGRES_URL_NON_POOLING: optionalUrl,

    DB_CONNECT_TIMEOUT_SECONDS: z.coerce.number().int().positive().optional(),
    DB_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().positive().optional(),
    DB_MAX_CONNECTIONS: z.coerce.number().int().positive().optional(),
    DB_POOL_MODE: optionalString,
    DB_SSL: optionalString,
    USE_PGBOUNCER: optionalString,

    MAILJET_API_KEY: z.string().optional(),
    MAILJET_SECRET_KEY: z.string().optional(),
    MAILJET_SENDER_EMAIL: optionalString.default('gabriel@asof.org.br'),
    MAILJET_SENDER_NAME: optionalString.default('ASOF Intranet'),
    MAILJET_SENDER_VALIDATED: optionalBooleanString.default('false').transform((v) => v === 'true'),
    ASOF_INTRANET_URL: optionalUrl,
    GEMINI_API_KEY: optionalString.describe('Gemini API key for AI features'),

    GMAIL_CLIENT_ID: optionalString,
    GMAIL_CLIENT_SECRET: optionalString,
    GMAIL_REFRESH_TOKEN: optionalString,
    GMAIL_USER: z.string().email().default('controller@asof.org.br'),
    GMAIL_MAX_EMAILS_PER_RUN: z.coerce.number().int().positive().default(10),
    GMAIL_WATCH_TOPIC: optionalString,

    NEXT_PUBLIC_AI_ENABLED: z
      .string()
      .optional()
      .transform(emptyToUndefined)
      .pipe(z.enum(['true', 'false']).default('false'))
      .transform((v) => v === 'true'),

    SKIP_AUTH: optionalString.default('false'),
    SESSION_SECRET: optionalSecretString,
    DEV_USER_ID: optionalString,
    DEV_USER_NAME: optionalString,
    DEV_USER_EMAIL: optionalString,
    DEV_USER_ROLE: optionalString,
    DEV_USER_MUST_CHANGE_PASSWORD: optionalString.default('false'),

    INITIAL_ADMIN_EMAIL: optionalString,
    INITIAL_ADMIN_PASSWORD: optionalString,

    NODE_ENV: optionalString,
    VERCEL_ENV: optionalString,
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    CRON_SECRET: optionalNonEmptyString,
    ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY: optionalSecretString,
    ASSINAFY_API_KEY: optionalString,
    ASSINAFY_ACCOUNT_ID: optionalString,
    ASSINAFY_WEBHOOK_SECRET: optionalNonEmptyString,
    ASSINAFY_BASE_URL: optionalUrl,
    ENCRYPTION_MASTER_KEY: optionalSecretString,
    TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.DATABASE_URL ||
      data.DATABASE_POSTGRES_URL ||
      data.POSTGRES_URL ||
      data.POSTGRES_PRISMA_URL,
    {
      message:
        'Either DATABASE_URL, DATABASE_POSTGRES_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL must be set.',
      path: ['DATABASE_URL'],
    },
  )
  .refine(
    (data) => {
      if (data.SKIP_AUTH === 'true' && data.NODE_ENV !== 'production') {
        return !!data.DEV_USER_ID;
      }
      return true;
    },
    {
      message: 'DEV_USER_ID is required when SKIP_AUTH=true',
      path: ['DEV_USER_ID'],
    },
  )
  .refine(
    (data) => {
      if (data.VERCEL_ENV === 'production') {
        return !!data.CRON_SECRET;
      }
      return true;
    },
    {
      message: 'CRON_SECRET is required for production Vercel cron dispatch.',
      path: ['CRON_SECRET'],
    },
  )
  .refine(
    (data) => {
      if (data.VERCEL_ENV !== 'production') return true;
      return !!data.DATABASE_URL && !!data.DATABASE_MIGRATION_URL;
    },
    {
      message:
        'Production must set explicit DATABASE_URL and DATABASE_MIGRATION_URL; legacy provider fallbacks are not allowed as the production database contract.',
      path: ['DATABASE_MIGRATION_URL'],
    },
  )
  .refine(
    (data) => {
      if (data.VERCEL_ENV !== 'production' && data.VERCEL_ENV !== 'preview') return true;
      return !!data.ENCRYPTION_MASTER_KEY;
    },
    {
      message: 'ENCRYPTION_MASTER_KEY is required for production and preview PII encryption.',
      path: ['ENCRYPTION_MASTER_KEY'],
    },
  )
  .refine(
    (data) => {
      if (data.SKIP_AUTH === 'true' && data.NODE_ENV !== 'production') {
        return true;
      }
      return !!data.SESSION_SECRET;
    },
    {
      message: 'SESSION_SECRET is required when SKIP_AUTH is not enabled.',
      path: ['SESSION_SECRET'],
    },
  )
  .refine(
    (data) => {
      if (data.VERCEL_ENV === 'production') {
        return !!data.ASOF_INTRANET_URL;
      }
      return true;
    },
    {
      message: 'ASOF_INTRANET_URL is required for production app links.',
      path: ['ASOF_INTRANET_URL'],
    },
  )
  .refine(
    (data) => {
      if (data.VERCEL_ENV !== 'production') return true;
      if (!data.INITIAL_ADMIN_EMAIL) return true;
      const email = data.INITIAL_ADMIN_EMAIL.toLowerCase();
      return !email.includes('example.invalid') && !email.includes('example.com');
    },
    {
      message:
        'INITIAL_ADMIN_EMAIL contém placeholder de exemplo — defina um valor real para produção',
      path: ['INITIAL_ADMIN_EMAIL'],
    },
  )
  .refine(
    (data) => {
      if (data.VERCEL_ENV !== 'production') return true;
      if (!data.INITIAL_ADMIN_PASSWORD) return true;
      return !data.INITIAL_ADMIN_PASSWORD.toLowerCase().includes('changeme');
    },
    {
      message:
        'INITIAL_ADMIN_PASSWORD contém placeholder de exemplo — defina um valor real para produção',
      path: ['INITIAL_ADMIN_PASSWORD'],
    },
  );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  throw new Error('Invalid environment variables. See above.');
}

export const env = parsed.data;
export type Env = typeof env;
