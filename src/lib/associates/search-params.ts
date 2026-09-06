import { associateSearchParamsSchema } from '@/lib/validation/schemas';
import { escapeLikePattern } from '@/lib/db/like-pattern';

export {
  ASSOCIATE_SEARCH_MODES,
  CPF_SEARCH_DIGITS,
  MIN_SEARCH_CHARS,
  MIN_SIAPE_SEARCH_DIGITS,
  associateSearchHelp,
  associateSearchPlaceholder,
  buildAssociatesSearchParams,
  isAssociateSearchReady,
  normalizeAssociateNameForSearch,
  normalizeCpfForSearch,
  normalizeSiapeForSearch,
  type AssociateSearchMode,
  type AssociatesSearchParams,
} from './search-params.shared';

import type { AssociatesSearchParams, AssociateSearchMode } from './search-params.shared';

export function parseAssociatesSearchParams(params: {
  q?: string;
  page?: string;
  searchBy?: string;
  contributionStatus?: string;
  functionalStatus?: string;
  associationStatus?: string;
  location?: string;
}): AssociatesSearchParams {
  const parsed = associateSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1, searchBy: 'name' };
  }
  return {
    q: (parsed.data.q ?? '').trim().slice(0, 80),
    page: parsed.data.page,
    searchBy: (parsed.data.searchBy ?? 'name') as AssociateSearchMode,
    contributionStatus: parsed.data.contributionStatus,
    functionalStatus: parsed.data.functionalStatus,
    associationStatus: parsed.data.associationStatus,
    location: parsed.data.location,
  };
}

export function buildAssociateNameSearchPattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}
