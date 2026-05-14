import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '@/lib/env';

// databaseUrl intentionally prefers DATABASE_URL for runtime connections.
// Falls back to Supabase Vercel integration var names (POSTGRES_URL, POSTGRES_PRISMA_URL).
const databaseUrl =
  env.DATABASE_URL ??
  env.DATABASE_POSTGRES_URL ??
  env.POSTGRES_PRISMA_URL ??
  env.POSTGRES_URL;

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
  max: env.DB_MAX_CONNECTIONS ?? 10,
  max_lifetime: 60 * 30,
  connect_timeout: env.DB_CONNECT_TIMEOUT_SECONDS ?? 10,
  idle_timeout: env.DB_IDLE_TIMEOUT_SECONDS ?? 20,
  connection: {
    application_name: 'asof-intranet',
    statement_timeout: 30000,
  },
  ssl:
    env.DB_SSL === 'true' ||
    env.NODE_ENV === 'production' ||
    parsedDatabaseUrl.searchParams.get('sslmode') === 'require'
      ? 'require'
      : undefined,
});

export const db = drizzle(client, { schema });

export type Tx =
  | typeof db
  | PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
