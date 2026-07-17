import { db, type DbExecutor } from '@/lib/db';
import { oficios } from '@/lib/db/schema/oficios';
import { and, eq, isNull } from 'drizzle-orm';
import type { AssinafyStatusPatch } from './types';

export async function findOficioByAssinafyDocumentId(documentId: string, tx: DbExecutor = db) {
  const [result] = await tx
    .select()
    .from(oficios)
    .where(eq(oficios.assinafyDocumentId, documentId))
    .limit(1);
  return result ?? null;
}

export async function updateAssinafyStatus(
  oficioId: number,
  status: string,
  additionalFields?: AssinafyStatusPatch,
  tx: DbExecutor = db,
) {
  const [result] = await tx
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
  tx: DbExecutor = db,
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

export async function claimAssinafySubmission(
  oficioId: number,
  updatedBy: number,
  tx: DbExecutor = db,
) {
  const [result] = await tx
    .update(oficios)
    .set({
      assinafyStatus: 'uploading',
      assinafyError: null,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(oficios.id, oficioId),
        isNull(oficios.assinafyDocumentId),
        isNull(oficios.assinafyStatus),
      ),
    )
    .returning();
  return result ?? null;
}

export async function finalizeAssinafySubmission(
  oficioId: number,
  fields: {
    assinafyDocumentId: string;
    assinafySigningUrl: string;
    assinafyAssignmentId: string;
    assinafySignerId: string;
    assinafySentAt: Date;
    updatedBy: number;
  },
  tx: DbExecutor = db,
) {
  const [result] = await tx
    .update(oficios)
    .set({ ...fields, assinafyStatus: 'pending_signature', assinafyError: null, updatedAt: new Date() })
    .where(and(eq(oficios.id, oficioId), eq(oficios.assinafyStatus, 'uploading')))
    .returning();
  return result ?? null;
}

export async function failAssinafySubmission(
  oficioId: number,
  fields: {
    assinafyDocumentId?: string;
    assinafyAssignmentId?: string;
    assinafySignerId?: string;
    assinafyError: string;
    updatedBy: number;
  },
  tx: DbExecutor = db,
) {
  const [result] = await tx
    .update(oficios)
    .set({ ...fields, assinafyStatus: 'failed', updatedAt: new Date() })
    .where(and(eq(oficios.id, oficioId), eq(oficios.assinafyStatus, 'uploading')))
    .returning();
  return result ?? null;
}
