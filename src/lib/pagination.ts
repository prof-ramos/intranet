export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationBounds {
  totalPages: number;
  from: number;
  to: number;
}

export function normalizePagination(
  page: number,
  pageSize: number,
  defaultPageSize = DEFAULT_PAGE_SIZE,
): PaginationParams {
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const normalizedPageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : defaultPageSize;
  return { page: normalizedPage, pageSize: normalizedPageSize };
}

export function calculatePaginationBounds(
  page: number,
  pageSize: number,
  total: number,
): PaginationBounds {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
  const to = total === 0 ? 0 : Math.min(page * pageSize, total);
  return { totalPages, from, to };
}
