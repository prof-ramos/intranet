import { associateSearchParamsSchema } from '@/lib/validation/schemas';

export interface AssociatesSearchParams {
  q: string;
  page: number;
}

export function parseAssociatesSearchParams(params: {
  q?: string;
  page?: string;
}): AssociatesSearchParams {
  const parsed = associateSearchParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { q: '', page: 1 };
  }
  return {
    q: (parsed.data.q ?? '').trim().slice(0, 80),
    page: parsed.data.page,
  };
}

export function buildAssociateNameSearchPattern(query: string): string {
  const escaped = query
    .replace(/\\/g, '\\\\')
    .replace(/_/g, '\\_')
    .replace(/%/g, '\\%');

  return `%${escaped}%`;
}
