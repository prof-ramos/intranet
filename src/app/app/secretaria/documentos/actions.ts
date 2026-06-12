'use server';

import { revalidatePath } from 'next/cache';
import { defineFormAction, defineServerAction } from '@/lib/server-actions/define-form-action';
import {
  uploadDocument,
  downloadDocument,
  deleteDocument,
  type UploadDocumentInput,
} from '@/lib/documents/service';
import { z } from 'zod';

const uploadSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.').max(255, 'Nome muito longo.'),
  description: z
    .string()
    .max(1000, 'Descrição muito longa.')
    .optional()
    .transform((value) => value || undefined),
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
  file: z
    .unknown()
    .superRefine((value, context) => {
      if (!(value instanceof File) || value.size <= 0) {
        context.addIssue({ code: 'custom', message: 'Nenhum arquivo enviado.' });
        return;
      }
      if (value.size > 15 * 1024 * 1024) {
        context.addIssue({ code: 'custom', message: 'O arquivo não pode exceder 15MB.' });
      }
    })
    .transform((value) => value as File),
});

export const uploadDocumentAction = defineFormAction({
  auth: ['admin', 'secretaria'],
  schema: uploadSchema,
  service: async (data, user) => {
    const bytes = await data.file.arrayBuffer();

    const input: UploadDocumentInput = {
      name: data.name,
      description: data.description,
      category: data.category,
      file: {
        bytes,
        size: data.file.size,
        type: data.file.type,
        originalName: data.file.name,
      },
      uploadedBy: user.userId,
    };

    const result = await uploadDocument(input);

    if (result.success) {
      revalidatePath('/app/secretaria/documentos');
    }

    return result;
  },
});

export const downloadDocumentAction = defineServerAction({
  auth: ['admin', 'secretaria'],
  schema: z.object({ id: z.number().int().positive('ID inválido.') }),
  service: async (data, user) => {
    const result = await downloadDocument(data.id, user.userId);

    if (!result.success) {
      throw new Error(result.message);
    }

    return { signedUrl: result.signedUrl };
  },
});

export const deleteDocumentAction = defineServerAction({
  auth: ['admin', 'secretaria'],
  schema: z.object({ id: z.number().int().positive('ID inválido.') }),
  service: async (data, user) => {
    const result = await deleteDocument(data.id, user.userId);

    if (result.success) {
      revalidatePath('/app/secretaria/documentos');
    }

    return result;
  },
});
