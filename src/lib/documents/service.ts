import { randomUUID } from 'node:crypto';
import { uploadFile, getSignedUrl, deleteFile } from '@/lib/storage';
import { logAuditAction, logDataAccess } from '@/lib/audit/service';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import {
  insertDocument,
  getDocumentById,
  updateDocumentStoragePath,
  deleteDocumentById,
} from './repository';

const logger = createLogger('documents/service');

export interface UploadDocumentInput {
  name: string;
  description: string | null;
  category: string;
  file: { name: string; size: number; type: string; bytes: ArrayBuffer };
  uploadedBy: number;
}

export interface UploadDocumentResult {
  id: number;
  storagePath: string;
}

export interface DownloadDocumentResult {
  signedUrl: string;
}

/**
 * Upload a document: upload temp file → insert DB → move to final path → clean up temp.
 * On failure, rolls back both storage and DB.
 */
export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<UploadDocumentResult> {
  const fileExt = input.file.name.split('.').pop() || '';
  const safeFilename = `${randomUUID()}.${fileExt}`;
  const finalStoragePath = `${input.category}/${safeFilename}`;
  const tempStoragePath = `tmp/${safeFilename}`;

  // 1) Upload to temporary path
  await uploadFile('documents', tempStoragePath, input.file.bytes, input.file.type);

  let docId: number | undefined;
  try {
    // 2) Insert DB record with temp path
    const inserted = await insertDocument({
      name: input.name,
      description: input.description,
      category: input.category,
      storagePath: tempStoragePath,
      fileSize: input.file.size,
      fileType: input.file.type,
      uploadedBy: input.uploadedBy,
    });
    docId = inserted.id;

    // 3) Upload to final path
    await uploadFile('documents', finalStoragePath, input.file.bytes, input.file.type);

    // 4) Update DB with final path
    await updateDocumentStoragePath(docId, finalStoragePath);

    // 5) Remove temp file (best-effort)
    try {
      await deleteFile('documents', [tempStoragePath]);
    } catch (err) {
      logger.warn('Falha ao remover arquivo temporário após move', {
        tempStoragePath,
        error: toSafeErrorLog(err),
      }, err as Error);
    }
  } catch (error) {
    // Rollback: remove temp storage + DB row if inserted
    try {
      await deleteFile('documents', [tempStoragePath]);
    } catch {
      // Ignore — temp cleanup is best-effort
    }
    if (docId !== undefined) {
      try {
        await deleteDocumentById(docId);
      } catch {
        // Ignore — DB rollback is best-effort at this point
      }
    }
    throw error;
  }

  // 6) Audit
  await logAuditAction({
    adminId: input.uploadedBy,
    action: 'upload',
    entityType: 'document',
    entityId: docId,
    metadata: {
      name: input.name,
      category: input.category,
      storagePath: finalStoragePath,
      fileSize: input.file.size,
      fileType: input.file.type,
    },
  });

  return { id: docId, storagePath: finalStoragePath };
}

/**
 * Get a signed download URL for a document.
 */
export async function downloadDocument(
  id: number,
  userId: number,
): Promise<DownloadDocumentResult> {
  const doc = await getDocumentById(id);
  if (!doc) {
    throw new Error('Documento não encontrado.');
  }

  const signedUrl = await getSignedUrl('documents', doc.storagePath, 3600);

  await logDataAccess({
    adminId: userId,
    action: 'view',
    entityType: 'document',
    entityId: doc.id,
    metadata: {
      name: doc.name,
      category: doc.category,
      storagePath: doc.storagePath,
    },
  });

  return { signedUrl };
}

/**
 * Delete a document: remove DB record → remove storage file (best-effort).
 */
export async function deleteDocument(
  id: number,
  userId: number,
): Promise<void> {
  const doc = await getDocumentById(id);
  if (!doc) {
    throw new Error('Documento não encontrado.');
  }

  // DB delete first — if it fails, storage is untouched
  await deleteDocumentById(id);

  // Storage delete after DB commit — if it fails, file is orphaned
  try {
    await deleteFile('documents', [doc.storagePath]);
  } catch (err) {
    logger.error('Falha ao remover arquivo do storage após delete do registro', {
      storagePath: doc.storagePath,
      documentId: id,
      error: toSafeErrorLog(err),
    }, err as Error);
  }

  await logAuditAction({
    adminId: userId,
    action: 'delete',
    entityType: 'document',
    entityId: id,
    metadata: {
      name: doc.name,
      category: doc.category,
      storagePath: doc.storagePath,
    },
  });
}
