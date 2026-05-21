import { z } from 'zod';

const emptyStringToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalString = z.preprocess(emptyStringToUndefined, z.string().optional());
const optionalNonEmptyString = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);
const optionalSecretString = z.preprocess(
  emptyStringToUndefined,
  z.string().min(32).optional(),
);
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional());

export const envSchema = z
  .object({
    DATABASE_URL: optionalUrl,
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
    GEMINI_API_KEY: optionalString.describe('Gemini API key for AI features'),

    NEXT_PUBLIC_AI_ENABLED: z.preprocess(emptyStringToUndefined, z.enum(["true", "false"]).default("false")).transform(v => v === "true"),

    SKIP_AUTH: optionalString.default('false'),
    DEV_USER_ID: optionalString,
    DEV_USER_NAME: optionalString,
    DEV_USER_EMAIL: optionalString,
    DEV_USER_ROLE: optionalString,
    DEV_USER_MUST_CHANGE_PASSWORD: optionalString.default('false'),

    NODE_ENV: optionalString,
    VERCEL_ENV: optionalString,
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    CRON_SECRET: optionalNonEmptyString,
    ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY: optionalSecretString,
    ENCRYPTION_MASTER_KEY: optionalSecretString,
    TRUSTED_PROXY_COUNT: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).optional()),

    // ─── Supabase ───────────────────────────────────────────────────────────────
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalNonEmptyString,
    SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
    DATABASE_SUPABASE_URL: optionalUrl,
    DATABASE_SUPABASE_PUBLISHABLE_KEY: optionalNonEmptyString,
    DATABASE_SUPABASE_ANON_KEY: optionalNonEmptyString,
    DATABASE_SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
    NEXT_PUBLIC_DATABASE_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY: optionalNonEmptyString,
    NEXT_PUBLIC_DATABASE_SUPABASE_ANON_KEY: optionalNonEmptyString,
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
