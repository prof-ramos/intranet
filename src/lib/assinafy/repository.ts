import { db, type DbExecutor } from '@/lib/db';
import { oficios } from '@/lib/db/schema/oficios';
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import type { AssinafyDocumentStatusValue, AssinafyStatusPatch } from './types';

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
  status: AssinafyDocumentStatusValue,
  additionalFields?: AssinafyStatusPatch,
  tx: DbExecutor = db,
) {
  const [result] = await tx
    .update(oficios)
    .set({
      assinafyStatus: status,
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
        inArray(oficios.status, ['gerado', 'rascunho']),
        isNull(oficios.assinafyDocumentId),
        isNull(oficios.assinafyStatus),
      ),
    )
    .returning();
  return result ?? null;
}

export const INTERRUPTED_ASSINAFY_SUBMISSION_ERROR =
  'Envio interrompido. Reconcilie o ofício na Assinafy antes de qualquer novo envio.';

/**
 * Closes an abandoned claim without making it eligible for another blind POST.
 * Missing local provider IDs do not prove that the provider had no side effects.
 */
export async function failStaleAssinafySubmission(
  oficioId: number,
  updatedBy: number,
  staleThresholdMinutes = 10,
  tx: DbExecutor = db,
) {
  const cutoff = new Date(Date.now() - staleThresholdMinutes * 60 * 1000);
  const [result] = await tx
    .update(oficios)
    .set({
      assinafyStatus: 'failed',
      assinafyError: INTERRUPTED_ASSINAFY_SUBMISSION_ERROR,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(oficios.id, oficioId),
        eq(oficios.assinafyStatus, 'uploading'),
        lt(oficios.updatedAt, cutoff),
        isNull(oficios.assinafyDocumentId),
        isNull(oficios.assinafyAssignmentId),
        isNull(oficios.assinafySignerId),
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
    .set({
      ...fields,
      assinafyStatus: 'pending_signature',
      assinafyError: null,
      updatedAt: new Date(),
    })
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

export async function recordAssinafyReconciliationContext(
  oficioId: number,
  fields: {
    assinafyDocumentId?: string;
    assinafySigningUrl?: string;
    assinafyAssignmentId?: string;
    assinafySignerId?: string;
    assinafySentAt?: Date;
    assinafyError: string;
    updatedBy: number;
  },
  tx: DbExecutor = db,
) {
  const [result] = await tx
    .update(oficios)
    .set({ ...fields, updatedAt: new Date() })
    .where(
      and(
        eq(oficios.id, oficioId),
        isNull(oficios.assinafyDocumentId),
        isNull(oficios.assinafyAssignmentId),
        isNull(oficios.assinafySignerId),
      ),
    )
    .returning();
  return result ?? null;
}
