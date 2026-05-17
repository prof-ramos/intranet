import { juridicoConsultationsSearchParamsSchema } from '@/lib/validation/schemas';
import type { LegalConsultationStatus } from './status';

export interface JuridicoConsultationsSearchParams {
  q: string;
  status?: LegalConsultationStatus;
  page: number;
}

export function parseJuridicoConsultationsSearchParams(params: {
  q?: string;
  status?: string;
  page?: string;
}): JuridicoConsultationsSearchParams {
  const parsed = juridicoConsultationsSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1 };
  }

  return {
    q: (parsed.data.q ?? '').trim().slice(0, 120),
    status: parsed.data.status,
    page: parsed.data.page,
  };
}
