import { db } from '@/lib/db';
import { oficios, type NewOfficialLetter } from '@/lib/db/schema/oficios';
import { and, desc, eq, type ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as schema from '@/lib/db/schema';

export type Tx =
  | typeof db
  | PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export async function findOfficialLetters(year?: number, tx: Tx = db) {
  const filters = [];
  if (year) {
    filters.push(eq(oficios.year, year));
  }

  return tx
    .select()
    .from(oficios)
    .where(and(...filters))
    .orderBy(desc(oficios.createdAt));
}

export async function findOfficialLetterById(id: number, tx: Tx = db) {
  const [result] = await tx.select().from(oficios).where(eq(oficios.id, id));
  return result || null;
}

export async function getLastSequenceForYear(year: number, tx: Tx = db) {
  const [result] = await tx
    .select({ sequence: oficios.sequence })
    .from(oficios)
    .where(eq(oficios.year, year))
    .orderBy(desc(oficios.sequence))
    .limit(1);

  return result?.sequence ?? 0;
}

export async function createOfficialLetter(data: NewOfficialLetter, tx: Tx = db) {
  const [result] = await tx.insert(oficios).values(data).returning();
  return result;
}

export async function updateOfficialLetter(id: number, data: Partial<NewOfficialLetter>, tx: Tx = db) {
  const [result] = await tx.update(oficios).set(data).where(eq(oficios.id, id)).returning();
  return result;
}

export async function cancelOfficialLetter(id: number, updatedBy: number, tx: Tx = db) {
  const [result] = await tx
    .update(oficios)
    .set({ status: 'cancelado', updatedBy, updatedAt: new Date() })
    .where(eq(oficios.id, id))
    .returning();
  return result;
}
