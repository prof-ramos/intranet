import { db, type Tx } from '@/lib/db';
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

export async function updateAssinafyFields(
  oficioId: number,
  fields: {
    assinafyDocumentId: string;
    assinafyStatus: typeof oficios.$inferSelect.assinafyStatus;
    assinafySigningUrl: string;
    assinafyAssignmentId: string;
    assinafySignerId: string;
    assinafySentAt: Date;
    assinafyError?: string | null;
    updatedBy: number;
  },
  tx: Tx = db,
) {
  const [result] = await tx
    .update(oficios)
    .set({
      assinafyDocumentId: fields.assinafyDocumentId,
      assinafyStatus: fields.assinafyStatus,
      assinafySigningUrl: fields.assinafySigningUrl,
      assinafyAssignmentId: fields.assinafyAssignmentId,
      assinafySignerId: fields.assinafySignerId,
      assinafySentAt: fields.assinafySentAt,
      assinafyError: fields.assinafyError ?? null,
      updatedBy: fields.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(oficios.id, oficioId))
    .returning();
  return result ?? null;
}
