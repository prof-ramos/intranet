const MAX_QUERY_LENGTH = 80;

export interface AssociatesSearchParams {
  q: string;
  page: number;
}

function parsePage(value: string | undefined): number {
  if (!value) return 1;

  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) return 1;

  return page;
}

export function parseAssociatesSearchParams(params: {
  q?: string;
  page?: string;
}): AssociatesSearchParams {
  return {
    q: (params.q ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    page: parsePage(params.page),
  };
}

export function buildAssociateNameSearchPattern(query: string): string {
  const escaped = query
    .replace(/\\/g, '\\\\')
    .replace(/_/g, '\\_')
    .replace(/%/g, '\\%');

  return `%${escaped}%`;
}
