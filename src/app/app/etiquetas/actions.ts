'use server';

import { z } from 'zod';
import { defineServerAction } from '@/lib/server-actions/define-form-action';
import {
  searchAssociatesForEtiquetas,
  type EtiquetaAssociateOption,
} from '@/lib/etiquetas/associates';

export type { EtiquetaAssociateOption };

const ALLOWED_ROLES = ['admin', 'diretoria', 'secretaria'] as const;

const querySchema = z.string().optional();

const _fetchAssociatesForEtiquetas = defineServerAction({
  auth: ALLOWED_ROLES,
  schema: querySchema,
  service: async (query) => searchAssociatesForEtiquetas(query),
});

/** Thin wrapper so callers can omit the query argument (optional schema input). */
export async function fetchAssociatesForEtiquetas(
  query?: string,
): Promise<EtiquetaAssociateOption[]> {
  return _fetchAssociatesForEtiquetas(query);
}
