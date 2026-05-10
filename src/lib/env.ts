import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z.string().url().optional(),
    DATABASE_POSTGRES_URL: z.string().url().optional(),

    DB_CONNECT_TIMEOUT_SECONDS: z.string().optional(),
    DB_IDLE_TIMEOUT_SECONDS: z.string().optional(),
    DB_MAX_CONNECTIONS: z.string().optional(),
    DB_POOL_MODE: z.string().optional(),
    DB_SSL: z.string().optional(),
    USE_PGBOUNCER: z.string().optional(),

    SESSION_SECRET: z
      .string({
        message:
          'SESSION_SECRET must be set and at least 32 characters long. ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      })
      .min(
        32,
        'SESSION_SECRET must be set and at least 32 characters long. ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      ),

    SKIP_AUTH: z.string().optional().default('false'),
    DEV_USER_ID: z.string().optional(),
    DEV_USER_NAME: z.string().optional(),
    DEV_USER_EMAIL: z.string().optional(),
    DEV_USER_ROLE: z.string().optional(),
    DEV_USER_MUST_CHANGE_PASSWORD: z.string().optional().default('false'),

    NODE_ENV: z.string().optional(),
  })
  .refine(
    (data) => data.DATABASE_URL || data.DATABASE_POSTGRES_URL,
    {
      message: 'Either DATABASE_URL or DATABASE_POSTGRES_URL must be set.',
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
