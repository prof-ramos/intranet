'use server';

import { requireRole } from '@/lib/auth/authorization';
import {
  searchAssociatesForEtiquetas,
  type EtiquetaAssociateOption,
} from '@/lib/etiquetas/associates';

export type { EtiquetaAssociateOption };

export async function fetchAssociatesForEtiquetas(query?: string): Promise<EtiquetaAssociateOption[]> {
  await requireRole(['admin', 'diretoria', 'secretaria']);
  return searchAssociatesForEtiquetas(query);
}
