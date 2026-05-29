'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import {
  uploadDocument,
  downloadDocument,
  deleteDocument,
  type UploadDocumentInput,
} from '@/lib/documents/service';
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

  const bytes = await file.arrayBuffer();

  const input: UploadDocumentInput = {
    name: parsed.data.name,
    description: parsed.data.description,
    category: parsed.data.category,
    file: {
      bytes,
      size: file.size,
      type: file.type,
      originalName: file.name,
    },
    uploadedBy: user.userId,
  };

  const result = await uploadDocument(input);

  if (result.success) {
    revalidatePath('/app/secretaria/documentos');
  }

  return result;
}

export async function downloadDocumentAction(id: number) {
  const user = await requireAuth();
  if (user.role !== 'admin' && user.role !== 'secretaria') {
    throw new Error('Acesso negado. Apenas administradores e secretários podem baixar documentos.');
  }

  const result = await downloadDocument(id, user.userId);

  if (!result.success) {
    throw new Error(result.message);
  }

  return { signedUrl: result.signedUrl };
}

export async function deleteDocumentAction(id: number) {
  const user = await requireAuth();
  if (user.role !== 'admin' && user.role !== 'secretaria') {
    throw new Error(
      'Acesso negado. Apenas administradores e secretários podem excluir documentos.',
    );
  }

  const result = await deleteDocument(id, user.userId);

  if (result.success) {
    revalidatePath('/app/secretaria/documentos');
  }

  return result;
}
