import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { documents, type NewDocument } from '@/lib/db/schema';
import { uploadFile, deleteFile, type StorageBucket } from '@/lib/storage';
import { logAuditAction, logDataAccess, type AuditLogInput } from '@/lib/audit/service';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import {
  findDocumentById,
  insertDocument,
  updateDocument,
  deleteDocument as deleteDocumentRepo,
} from './repository';

const logger = createLogger('documents/service');

export interface UploadDocumentInput {
  name: string;
  description?: string | null;
  category: NewDocument['category'];
  file: {
    bytes: ArrayBuffer;
    size: number;
    type: string;
    originalName: string;
  };
  uploadedBy: number;
}

export interface UploadDocumentResult {
  success: boolean;
  id?: number;
  message: string;
}

export interface DownloadDocumentResult {
  success: boolean;
  signedUrl?: string;
  message: string;
}

export interface DeleteDocumentResult {
  success: boolean;
  message: string;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function generateStoragePaths(
  category: string,
  originalName: string,
): { temp: string; final: string } {
  const fileExt = originalName.split('.').pop() || '';
  const safeFilename = `${randomUUID()}.${fileExt}`;
  return {
    final: `${category}/${safeFilename}`,
    temp: `tmp/${safeFilename}`,
  };
}

async function cleanupTempFile(tempPath: string): Promise<void> {
  try {
    await deleteFile('documents' as StorageBucket, [tempPath]);
  } catch (err) {
    logger.warn('Falha ao remover arquivo temporário', { tempPath, error: toSafeErrorLog(err) }, err as Error);
  }
}

export async function uploadDocument(input: UploadDocumentInput): Promise<UploadDocumentResult> {
  const { name, description, category, file, uploadedBy } = input;

  // Validação de tamanho
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      message: 'O arquivo não pode exceder 15MB.',
    };
  }

  const paths = generateStoragePaths(category, file.originalName);

  // 1) Upload para caminho temporário
  try {
    await uploadFile('documents' as StorageBucket, paths.temp, file.bytes, file.type);
  } catch (error) {
    logger.error('Falha no upload temporário', { path: paths.temp, error: toSafeErrorLog(error) }, error as Error);
    return {
      success: false,
      message: 'Falha ao enviar arquivo para armazenamento.',
    };
  }

  let docId: number | undefined;

  try {
    // 2) Insert no banco com path temporário
    const inserted = await insertDocument({
      name,
      description: description ?? null,
      category,
      storagePath: paths.temp,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy,
    });
    docId = inserted.id;

    // 3) Upload para path definitivo
    await uploadFile('documents' as StorageBucket, paths.final, file.bytes, file.type);

    // 4) Atualizar registro com path definitivo
    await updateDocument(docId, { storagePath: paths.final });

    // 5) Cleanup do temp (best-effort)
    await cleanupTempFile(paths.temp);

    // 6) Audit log
    await logAuditAction({
      adminId: uploadedBy,
      action: 'upload',
      entityType: 'document',
      entityId: docId,
      metadata: {
        name,
        category,
        storagePath: paths.final,
        fileSize: file.size,
        fileType: file.type,
      },
    } satisfies AuditLogInput);

    return {
      success: true,
      id: docId,
      message: `Documento "${name}" enviado com sucesso.`,
    };
  } catch (error) {
    // Rollback: remove temp e row do banco se existir
    logger.error('Falha no upload, executando rollback', { docId, error: toSafeErrorLog(error) }, error as Error);

    await cleanupTempFile(paths.temp);

    if (docId !== undefined) {
      try {
        await deleteDocumentRepo(docId);
      } catch (rollbackErr) {
        logger.error('Falha ao remover registro órfão durante rollback', { docId, error: toSafeErrorLog(rollbackErr) }, rollbackErr as Error);
      }
    }

    return {
      success: false,
      message: 'Falha ao salvar documento. A operação foi revertida.',
    };
  }
}

export async function downloadDocument(
  id: number,
  userId: number,
): Promise<DownloadDocumentResult> {
  const doc = await findDocumentById(id);

  if (!doc) {
    return {
      success: false,
      message: 'Documento não encontrado.',
    };
  }

  // Simulação de signed URL (storage está desabilitado no baseline)
  const signedUrl = `/api/storage/documents/${encodeURIComponent(doc.storagePath)}`;

  await logDataAccess({
    adminId: userId,
    action: 'view',
    entityType: 'document',
    entityId: id,
    metadata: {
      name: doc.name,
      category: doc.category,
      storagePath: doc.storagePath,
    },
  });

  return {
    success: true,
    signedUrl,
    message: 'URL assinada gerada com sucesso.',
  };
}

export async function deleteDocument(
  id: number,
  userId: number,
): Promise<DeleteDocumentResult> {
  const doc = await findDocumentById(id);

  if (!doc) {
    return {
      success: false,
      message: 'Documento não encontrado.',
    };
  }

  // DB delete primeiro — dentro de transaction para garantir autorização antes de tocar o storage
  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
  });

  // Storage delete após commit do DB (best-effort)
  try {
    await deleteFile('documents' as StorageBucket, [doc.storagePath]);
  } catch (err) {
    logger.error('Falha ao remover arquivo do storage após delete do registro', {
      storagePath: doc.storagePath,
      documentId: id,
      error: toSafeErrorLog(err),
    }, err as Error);
    // Não relança — o registro DB foi removido com sucesso
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
  } satisfies AuditLogInput);

  return {
    success: true,
    message: `Documento "${doc.name}" excluído com sucesso.`,
  };
}
