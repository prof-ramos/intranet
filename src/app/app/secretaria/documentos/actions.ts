'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/require-auth';
import { z } from 'zod';
import { uploadDocument, downloadDocument, deleteDocument } from '@/lib/documents/service';

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

const ALLOWED_ROLES = ['admin', 'secretaria'] as const;

function requireDocumentRole(user: { role: string }): void {
  if (!ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
    throw new Error('Acesso negado. Apenas administradores e secretários podem gerenciar documentos.');
  }
}

export async function uploadDocumentAction(formData: FormData) {
  const user = await requireAuth();
  requireDocumentRole(user);

  const name = formData.get('name') as string;
  const description = (formData.get('description') as string) || undefined;
  const category = formData.get('category') as string;
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    throw new Error('Nenhum arquivo enviado.');
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error('O arquivo não pode exceder 15MB.');
  }

  const parsed = uploadSchema.safeParse({ name, description, category });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const bytes = await file.arrayBuffer();

  const result = await uploadDocument({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      bytes,
    },
    uploadedBy: user.userId,
  });

  revalidatePath('/app/secretaria/documentos');
  return { success: true, id: result.id };
}

export async function downloadDocumentAction(id: number) {
  const user = await requireAuth();
  requireDocumentRole(user);

  const result = await downloadDocument(id, user.userId);
  return { signedUrl: result.signedUrl };
}

export async function deleteDocumentAction(id: number) {
  const user = await requireAuth();
  requireDocumentRole(user);

  await deleteDocument(id, user.userId);

  revalidatePath('/app/secretaria/documentos');
  return { success: true };
}
