import { describe, expect, it } from 'vitest';
import {
  calculatePaginationBounds,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePagination,
  generatePaginationWindow,
} from './pagination';

describe('normalizePagination', () => {
  it('defaults invalid values to safe defaults', () => {
    expect(normalizePagination(0, 0)).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(normalizePagination(-3, -10)).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(normalizePagination(Number.NaN, Number.NaN)).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('preserves valid positive integer values', () => {
    expect(normalizePagination(3, 50)).toEqual({ page: 3, pageSize: 50 });
  });

  it('caps pageSize to MAX_PAGE_SIZE', () => {
    expect(normalizePagination(1, 200)).toEqual({ page: 1, pageSize: MAX_PAGE_SIZE });
  });

  it('uses custom defaultPageSize when provided', () => {
    expect(normalizePagination(0, 0, 50)).toEqual({ page: 1, pageSize: 50 });
  });
});

describe('calculatePaginationBounds', () => {
  it('calculates bounds for first page', () => {
    expect(calculatePaginationBounds(1, 20, 45)).toEqual({ totalPages: 3, from: 1, to: 20 });
  });

  it('calculates bounds for last page', () => {
    expect(calculatePaginationBounds(3, 20, 45)).toEqual({ totalPages: 3, from: 41, to: 45 });
  });

  it('returns zeros when total is 0', () => {
    expect(calculatePaginationBounds(1, 20, 0)).toEqual({ totalPages: 1, from: 0, to: 0 });
  });

  it('returns at least 1 totalPage even for empty results', () => {
    expect(calculatePaginationBounds(1, 20, 0).totalPages).toBe(1);
  });
});

describe('generatePaginationWindow', () => {
  it('returns all pages when total is small', () => {
    expect(generatePaginationWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows window around current page with ellipsis for large totals', () => {
    expect(generatePaginationWindow(45, 88)).toEqual([1, '…', 43, 44, 45, 46, 47, '…', 88]);
  });

  it('shows early window without left ellipsis', () => {
    expect(generatePaginationWindow(2, 88)).toEqual([1, 2, 3, 4, 5, '…', 88]);
  });

  it('shows late window without right ellipsis', () => {
    expect(generatePaginationWindow(87, 88)).toEqual([1, '…', 84, 85, 86, 87, 88]);
  });

  it('handles first page', () => {
    expect(generatePaginationWindow(1, 88)).toEqual([1, 2, 3, 4, 5, '…', 88]);
  });

  it('handles last page', () => {
    expect(generatePaginationWindow(88, 88)).toEqual([1, '…', 84, 85, 86, 87, 88]);
  });

  it('respects custom window size', () => {
    expect(generatePaginationWindow(10, 100, 3)).toEqual([1, '…', 9, 10, 11, '…', 100]);
  });
});
