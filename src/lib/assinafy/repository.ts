import { db } from '@/lib/db';
import { oficios } from '@/lib/db/schema/oficios';
import { eq } from 'drizzle-orm';

export async function findOficioByAssinafyDocumentId(documentId: string) {
  const [result] = await db
    .select()
    .from(oficios)
    .where(eq(oficios.assinafyDocumentId, documentId))
    .limit(1);
  return result ?? null;
}

export async function updateAssinafyStatus(
  oficioId: number,
  status: string,
  additionalFields?: Record<string, unknown>,
) {
  const [result] = await db
    .update(oficios)
    .set({
      assinafyStatus: status as typeof oficios.$inferSelect.assinafyStatus,
      ...additionalFields,
      updatedAt: new Date(),
    })
    .where(eq(oficios.id, oficioId))
    .returning();
  return result;
}
