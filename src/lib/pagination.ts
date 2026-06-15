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

/**
 * Generate a pagination window with ellipsis for large page counts.
 * Always shows first/last page and a sliding window around current page.
 */
export function generatePaginationWindow(
  current: number,
  total: number,
  windowSize = 5,
): (number | string)[] {
  if (total <= windowSize + 2) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + windowSize - 1);

  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }

  const pages: (number | string)[] = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('…');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total) {
    if (end < total - 1) pages.push('…');
    pages.push(total);
  }

  return pages;
}
