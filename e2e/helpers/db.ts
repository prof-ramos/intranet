import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://gabrielramos@localhost:5432/asof_test';

const client = postgres(TEST_DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });

export async function truncateAll() {
  // Order matters due to foreign keys
  await client`TRUNCATE TABLE legal_notes, legal_consultations, legal_processes, legal_opinions, audit_logs, login_attempts, rate_limits, activities, associates, admins CASCADE`;
}

export async function closeDb() {
  await client.end();
}
