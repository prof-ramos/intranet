/**
 * Client-safe associate search helpers — no Zod / Drizzle imports.
 * Server-only parsing lives in `./search-params`.
 */

export type AssociateSearchMode = 'name' | 'cpf' | 'siape';

export const MIN_SEARCH_CHARS = 2;
export const CPF_SEARCH_DIGITS = 11;
export const MIN_SIAPE_SEARCH_DIGITS = 5;

export const ASSOCIATE_SEARCH_MODES: readonly { value: AssociateSearchMode; label: string }[] = [
  { value: 'name', label: 'Nome' },
  { value: 'cpf', label: 'CPF' },
  { value: 'siape', label: 'SIAPE' },
];

export interface AssociatesSearchParams {
  q: string;
  page: number;
  searchBy: AssociateSearchMode;
  contributionStatus?: 'em_dia' | 'inadimplente';
  functionalStatus?: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca';
  associationStatus?: 'associado' | 'nao_associado';
  location?: 'brasil' | 'exterior';
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
  if (next.location) params.location = next.location;
  if (next.page && next.page !== 1) params.page = String(next.page);

  return params;
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
 */
export function normalizeSiapeForSearch(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function normalizeAssociateNameForSearch(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isAssociateSearchReady(query: string, searchBy: AssociateSearchMode): boolean {
  const trimmed = query.trim();
  if (searchBy === 'name') {
    return trimmed.length >= MIN_SEARCH_CHARS;
  }

  const digits =
    searchBy === 'cpf' ? normalizeCpfForSearch(trimmed) : normalizeSiapeForSearch(trimmed);

  if (searchBy === 'cpf') {
    return digits.length === CPF_SEARCH_DIGITS;
  }

  return digits.length >= MIN_SIAPE_SEARCH_DIGITS;
}

export function associateSearchPlaceholder(searchBy: AssociateSearchMode): string {
  if (searchBy === 'cpf') return '000.000.000-00';
  if (searchBy === 'siape') return 'Matrícula SIAPE';
  return 'Digite o nome ou parte do nome…';
}

export function associateSearchHelp(searchBy: AssociateSearchMode): string {
  if (searchBy === 'cpf') return 'Informe o CPF completo. Pontuação é ignorada.';
  if (searchBy === 'siape') return 'Informe a matrícula SIAPE completa. Pontuação é ignorada.';
  return `Digite pelo menos ${MIN_SEARCH_CHARS} caracteres.`;
}
