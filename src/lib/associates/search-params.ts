import { associateSearchParamsSchema } from '@/lib/validation/schemas';
import { escapeLikePattern } from '@/lib/db/like-pattern';

export type AssociateSearchMode = 'name' | 'cpf' | 'siape';

export const MIN_SEARCH_CHARS = 2;

export interface AssociatesSearchParams {
  q: string;
  page: number;
  searchBy: AssociateSearchMode;
  contributionStatus?: 'em_dia' | 'inadimplente';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
  associationStatus?: 'associado' | 'nao_associado';
}

export function parseAssociatesSearchParams(params: {
  q?: string;
  page?: string;
  searchBy?: string;
  contributionStatus?: string;
  functionalStatus?: string;
  associationStatus?: string;
}): AssociatesSearchParams {
  const parsed = associateSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1, searchBy: 'name' };
  }
  return {
    q: (parsed.data.q ?? '').trim().slice(0, 80),
    page: parsed.data.page,
    searchBy: parsed.data.searchBy ?? 'name',
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
  if (next.searchBy && next.searchBy !== 'name') params.searchBy = next.searchBy;
  if (next.contributionStatus) params.contributionStatus = next.contributionStatus;
  if (next.functionalStatus) params.functionalStatus = next.functionalStatus;
  if (next.associationStatus) params.associationStatus = next.associationStatus;
  if (next.page && next.page !== 1) params.page = String(next.page);

  return params;
}

export function buildAssociateNameSearchPattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}

export function normalizeAssociateNameForSearch(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Strip non-digit characters from CPF for hash lookup.
 * Input "123.456.789-00" → "12345678900"
 */
export function normalizeCpfForSearch(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Strip non-digit characters from SIAPE for hash lookup.
 * Input may contain dots or spaces but SIAPE is numeric only.
 */
export function normalizeSiapeForSearch(raw: string): string {
  return raw.replace(/\D/g, '');
}
