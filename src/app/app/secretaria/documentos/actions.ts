'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/require-auth';
import { uploadFile, getSignedUrl, deleteFile } from '@/lib/storage';
import { logAuditAction, logDataAccess } from '@/lib/audit/service';
import { getDocumentById } from '@/lib/documents/queries';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import { toSafeErrorLog } from '@/lib/error-log';

const logger = createLogger('documentos/actions');

const uploadSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.').max(255, 'Nome muito longo.'),
  description: z.string().max(1000, 'Descrição muito longa.').optional(),
  category: z.enum([
    'modelo_contrato',
    'contrato',
    'minuta',
    'estatuto',
    'ata',
    'oficio',
    'rh',
    'evento',
    'nota_fiscal',
    'comprovante',
    'outro',
  ]),
});

export async function uploadDocumentAction(formData: FormData) {
  const user = await requireAuth();
  if (user.role !== 'admin' && user.role !== 'secretaria') {
    throw new Error('Acesso negado. Apenas administradores e secretários podem realizar upload.');
  }

  const name = formData.get('name') as string;
  const description = (formData.get('description') as string) || undefined;
  const category = formData.get('category') as string;
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    throw new Error('Nenhum arquivo enviado.');
  }

  const parsed = uploadSchema.safeParse({ name, description, category });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  // Limite de 15MB
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('O arquivo não pode exceder 15MB.');
  }

  const fileExt = file.name.split('.').pop() || '';
  const safeFilename = `${randomUUID()}.${fileExt}`;
  const finalStoragePath = `${parsed.data.category}/${safeFilename}`;
  // Caminho temporário: o arquivo sobe aqui primeiro, é movido para o path definitivo após o insert no DB
  const tempStoragePath = `tmp/${safeFilename}`;

  const bytes = await file.arrayBuffer();

  // 1) Upload para caminho temporário
  await uploadFile('documents', tempStoragePath, bytes, file.type);

  let docId: number | undefined;
  try {
    // 2) Insert + upload final + update em bloco — se qualquer passo falhar, cleanup do temp
    const [inserted] = await db
      .insert(documents)
      .values({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        storagePath: tempStoragePath,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: user.userId,
      })
      .returning({ id: documents.id });
    docId = inserted.id;

    // 3) Move do temp para o path definitivo via re-upload + update do registro
    await uploadFile('documents', finalStoragePath, bytes, file.type);
    await db
      .update(documents)
      .set({ storagePath: finalStoragePath })
      .where(eq(documents.id, docId));

    // 4) Remove o arquivo temporário (best-effort)
    try {
      await deleteFile('documents', [tempStoragePath]);
    } catch (err) {
      // Arquivo temporário não-crítico; será limpo por job periódico
      logger.warn('Falha ao remover arquivo temporário após move', { tempStoragePath, error: toSafeErrorLog(err) }, err as Error);
    }
  } catch (error) {
    // Rollback: remove o temp e, se o row foi inserido com o path temp, remove-o do banco
    try {
      await deleteFile('documents', [tempStoragePath]);
    } catch {
      // Ignora erro ao reverter upload temporário
    }
    if (docId !== undefined) {
      try {
        await db.delete(documents).where(eq(documents.id, docId));
      } catch {
        // Ignora erro ao reverter row órfão
      }
    }
    throw error;
  }

  await logAuditAction({
    adminId: user.userId,
    action: 'upload',
    entityType: 'document',
    entityId: docId,
    metadata: {
      name: parsed.data.name,
      category: parsed.data.category,
      storagePath: finalStoragePath,
      fileSize: file.size,
      fileType: file.type,
    },
  });

  revalidatePath('/app/secretaria/documentos');
  return { success: true, id: docId };
}

export async function downloadDocumentAction(id: number) {
  const user = await requireAuth();
  if (user.role !== 'admin' && user.role !== 'secretaria') {
    throw new Error('Acesso negado. Apenas administradores e secretários podem baixar documentos.');
  }

  const doc = await getDocumentById(id);
  if (!doc) {
    throw new Error('Documento não encontrado.');
  }

  const signedUrl = await getSignedUrl('documents', doc.storagePath, 3600);

  await logDataAccess({
    adminId: user.userId,
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

export async function deleteDocumentAction(id: number) {
  const user = await requireAuth();
  if (user.role !== 'admin' && user.role !== 'secretaria') {
    throw new Error(
      'Acesso negado. Apenas administradores e secretários podem excluir documentos.',
    );
  }

  const doc = await getDocumentById(id);
  if (!doc) {
    throw new Error('Documento não encontrado.');
  }

  // DB delete primeiro — dentro de transaction para garantir autorização antes de tocar o storage.
  // Se o tx.delete falhar, o storage não é tocado.
  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
  });

  // Storage delete após commit do DB. Se falhar, o registro já foi removido do banco —
  // o arquivo fica órfão no storage, detectável via auditoria.
  try {
    await deleteFile('documents', [doc.storagePath]);
  } catch (err) {
    logger.error('Falha ao remover arquivo do storage após delete do registro', {
      storagePath: doc.storagePath,
      documentId: id,
      error: toSafeErrorLog(err)
    }, err as Error);
    // Não relança — o registro DB foi removido com sucesso e o usuário não precisa
    // de detalhes internos de storage. O arquivo órfão será tratado via monitoramento.
  }

  await logAuditAction({
    adminId: user.userId,
    action: 'delete',
    entityType: 'document',
    entityId: id,
    metadata: {
      name: doc.name,
      category: doc.category,
      storagePath: doc.storagePath,
    },
  });

  revalidatePath('/app/secretaria/documentos');
  return { success: true };
}
