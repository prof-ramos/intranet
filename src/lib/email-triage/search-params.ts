import { z } from 'zod';
import { isEmailTriageStatus, isEmailTriageCategoria, isEmailTriageRisco } from './status';

const emailTriageSearchParamsSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  categoria: z.string().optional(),
  nivelRisco: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
});

export interface EmailTriageSearchParams {
  q: string;
  status?: string;
  categoria?: string;
  nivelRisco?: string;
  page: number;
}

export function parseEmailTriageSearchParams(params: {
  q?: string;
  status?: string;
  categoria?: string;
  nivelRisco?: string;
  page?: string;
}): EmailTriageSearchParams {
  const parsed = emailTriageSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1 };
  }

  return {
    q: (parsed.data.q ?? '').trim().slice(0, 120),
    status: isEmailTriageStatus(parsed.data.status ?? '') ? parsed.data.status : undefined,
    categoria: isEmailTriageCategoria(parsed.data.categoria ?? '') ? parsed.data.categoria : undefined,
    nivelRisco: isEmailTriageRisco(parsed.data.nivelRisco ?? '') ? parsed.data.nivelRisco : undefined,
    page: parsed.data.page,
  };
}
