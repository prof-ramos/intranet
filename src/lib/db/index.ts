import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/lib/env';

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// databaseUrl intentionally prefers DATABASE_URL for runtime connections.
const databaseUrl = env.DATABASE_URL ?? env.DATABASE_POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DATABASE_POSTGRES_URL must be set.');
}

if (env.DATABASE_URL && env.DATABASE_POSTGRES_URL) {
  console.warn(
    'Both DATABASE_URL and DATABASE_POSTGRES_URL are set; databaseUrl uses DATABASE_URL.',
  );
}

const parsedDatabaseUrl = new URL(databaseUrl);
const usesTransactionPooler =
  env.USE_PGBOUNCER === 'true' ||
  env.DB_POOL_MODE === 'transaction' ||
  parsedDatabaseUrl.searchParams.has('pgbouncer') ||
  parsedDatabaseUrl.hostname.includes('pooler.') ||
  parsedDatabaseUrl.port === '6543';

const client = postgres(databaseUrl, {
  prepare: !usesTransactionPooler,
  max: positiveInteger(env.DB_MAX_CONNECTIONS, 5),
  connect_timeout: positiveInteger(env.DB_CONNECT_TIMEOUT_SECONDS, 10),
  idle_timeout: positiveInteger(env.DB_IDLE_TIMEOUT_SECONDS, 20),
  ssl:
    env.DB_SSL === 'true' ||
    env.NODE_ENV === 'production' ||
    parsedDatabaseUrl.searchParams.get('sslmode') === 'require'
      ? 'require'
      : undefined,
});

export const db = drizzle(client, { schema });
