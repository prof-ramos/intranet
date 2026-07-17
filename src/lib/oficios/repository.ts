import { db, type DbExecutor } from '@/lib/db';
import { oficios, type NewOfficialLetter, type OfficialLetter } from '@/lib/db/schema/oficios';
import { and, desc, eq, isNull, ne, or, sql } from 'drizzle-orm';

// Stable two-int namespace: "ASOF" encoded as a signed-safe integer.
const OFFICIAL_LETTER_SEQUENCE_LOCK_NAMESPACE = 0x41534f46;

export async function lockOfficialLetterSequenceYear(year: number, tx: DbExecutor) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(${OFFICIAL_LETTER_SEQUENCE_LOCK_NAMESPACE}, ${year})`,
  );
}

export async function findOfficialLetters(
  year?: number,
  options?: { limit?: number; tx?: DbExecutor },
) {
  const limit = options?.limit ?? 100;
  const tx = options?.tx ?? db;
  const filters = [];
  if (year) {
    filters.push(eq(oficios.year, year));
  }

  return tx
    .select()
    .from(oficios)
    .where(and(...filters))
    .orderBy(desc(oficios.createdAt))
    .limit(limit);
}

export async function findOfficialLetterById(id: number, tx: DbExecutor = db) {
  const [result] = await tx.select().from(oficios).where(eq(oficios.id, id));
  return result || null;
}

/**
 * Fetches an Assinafy-linked Ofício while locking the row for the duration of
 * the caller's transaction. The explicit executor prevents the lock from being
 * acquired on a connection outside the transaction that owns the webhook claim.
 */
export async function findOfficialLetterByAssinafyDocumentIdForUpdate(
  documentId: string,
  tx: DbExecutor,
) {
  const [result] = await tx
    .select()
    .from(oficios)
    .where(eq(oficios.assinafyDocumentId, documentId))
    .limit(1)
    .for('update');

  return result ?? null;
}

export async function getLastSequenceForYear(year: number, tx: DbExecutor = db) {
  const [result] = await tx
    .select({ sequence: oficios.sequence })
    .from(oficios)
    .where(eq(oficios.year, year))
    .orderBy(desc(oficios.sequence))
    .limit(1);

  return result?.sequence ?? 0;
}

export async function createOfficialLetter(data: NewOfficialLetter, tx: DbExecutor = db) {
  const [result] = await tx.insert(oficios).values(data).returning();
  return result;
}

export async function updateOfficialLetter(
  id: number,
  data: Partial<NewOfficialLetter>,
  tx: DbExecutor = db,
) {
  const [result] = await tx.update(oficios).set(data).where(eq(oficios.id, id)).returning();
  return result;
}

export async function cancelOfficialLetter(
  id: number,
  updatedBy: number,
  tx: DbExecutor = db,
): Promise<OfficialLetter | null> {
  const [result] = await tx
    .update(oficios)
    .set({ status: 'cancelado', updatedBy, updatedAt: new Date() })
    .where(
      and(
        eq(oficios.id, id),
        or(isNull(oficios.assinafyStatus), ne(oficios.assinafyStatus, 'uploading')),
      ),
    )
    .returning();
  return result ?? null;
}
