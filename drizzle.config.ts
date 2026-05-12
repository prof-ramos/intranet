import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ??
  process.env.DATABASE_POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_MIGRATION_URL, DATABASE_POSTGRES_URL_NON_POOLING, DATABASE_POSTGRES_URL, or DATABASE_URL must be set.',
  );
}

let parsedDatabaseUrl: URL;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error('The resolved DATABASE_* value must be a valid PostgreSQL URL.');
}

if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
  throw new Error('The resolved DATABASE_* value must use postgres:// or postgresql://.');
}

// Transaction-mode pooler (port 6543 or pgbouncer param) breaks prepared statements.
// Session-mode pooler (port 5432 on pooler hostname) is safe for migrations.
const isTransactionPooler =
  parsedDatabaseUrl.searchParams.has('pgbouncer') ||
  parsedDatabaseUrl.port === '6543';

if (isTransactionPooler) {
  throw new Error(
    'Drizzle migrations require a direct or session-mode PostgreSQL URL (not transaction-mode pooler on port 6543). Set DATABASE_MIGRATION_URL or DATABASE_POSTGRES_URL_NON_POOLING.',
  );
}

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle/postgres',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
