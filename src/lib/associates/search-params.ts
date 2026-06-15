import { associateSearchParamsSchema } from '@/lib/validation/schemas';
import { escapeLikePattern } from '@/lib/db/like-pattern';

export interface AssociatesSearchParams {
  q: string;
  page: number;
  contributionStatus?: 'em_dia' | 'inadimplente' | 'pendente_migracao';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
  associationStatus?: 'ativo' | 'inativo';
}

export function parseAssociatesSearchParams(params: {
  q?: string;
  page?: string;
  contributionStatus?: string;
  functionalStatus?: string;
  associationStatus?: string;
}): AssociatesSearchParams {
  const parsed = associateSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1 };
  }
  return {
    q: (parsed.data.q ?? '').trim().slice(0, 80),
    page: parsed.data.page,
    contributionStatus: parsed.data.contributionStatus,
    functionalStatus: parsed.data.functionalStatus,
    associationStatus: parsed.data.associationStatus,
  };
}

export function buildAssociatesSearchParams(
  current: AssociatesSearchParams,
  updates: Partial<AssociatesSearchParams>,
): Record<string, string> {
  const next = { ...current, ...updates };
  const params: Record<string, string> = {};

  if (next.q) params.q = next.q;
  if (next.contributionStatus) params.contributionStatus = next.contributionStatus;
  if (next.functionalStatus) params.functionalStatus = next.functionalStatus;
  if (next.associationStatus) params.associationStatus = next.associationStatus;
  if (next.page && next.page !== 1) params.page = String(next.page);

  return params;
}

export function buildAssociateNameSearchPattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}
