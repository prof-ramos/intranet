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
import { z } from 'zod';

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
  // Caminho temporário: o arquivo só sobe para o path definitivo após o insert no DB
  const tempStoragePath = `tmp/${safeFilename}`;

  const bytes = await file.arrayBuffer();

  // 1) Upload para caminho temporário
  await uploadFile('documents', tempStoragePath, bytes, file.type);

  let docId: number;
  try {
    // 2) Insert no banco com o path temporário
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

    // 3) Move do temp para o path definitivo via re-upload + delete do temp
    await uploadFile('documents', finalStoragePath, bytes, file.type);
    await db
      .update(documents)
      .set({ storagePath: finalStoragePath })
      .where(eq(documents.id, docId));
    try {
      await deleteFile('documents', [tempStoragePath]);
    } catch {
      // Arquivo temporário não-crítico; será limpo por job periódico
    }
  } catch (error) {
    // Garante remoção do upload temporário em qualquer falha
    try {
      await deleteFile('documents', [tempStoragePath]);
    } catch {
      // Ignora erro ao reverter upload temporário
    }
    throw error;
  }

  const storagePath = finalStoragePath;

  await logAuditAction({
    adminId: user.userId,
    action: 'upload',
    entityType: 'document',
    entityId: docId,
    metadata: {
      name: parsed.data.name,
      category: parsed.data.category,
      storagePath,
      fileSize: file.size,
      fileType: file.type,
    },
  });

  revalidatePath('/app/secretaria/documentos');
  return { success: true, id: docId };
}

export async function downloadDocumentAction(id: number) {
  const user = await requireAuth();

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
    throw new Error('Acesso negado. Apenas administradores e secretários podem excluir documentos.');
  }

  const doc = await getDocumentById(id);
  if (!doc) {
    throw new Error('Documento não encontrado.');
  }

  // Remover do storage ANTES de commitar o delete do DB.
  // Se o storage falhar, o registro DB permanece intacto (nenhum dado é perdido).
  try {
    await deleteFile('documents', [doc.storagePath]);
  } catch (storageError) {
    throw new Error(
      `Falha ao remover arquivo do storage; o registro no banco não foi alterado. Erro: ${
        storageError instanceof Error ? storageError.message : String(storageError)
      }`,
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
  });

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
