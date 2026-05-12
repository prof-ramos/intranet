import { describe, expect, it, vi } from 'vitest';
import {
  formatAssociateDate,
  getAssociateStatusLabel,
  initialsFromName,
  yearsSinceDate,
} from '@/lib/associates/service';

describe('associates/profile helpers', () => {
  it('formats date values for pt-BR display', () => {
    expect(formatAssociateDate('2026-05-11')).toBe('11 de maio de 2026');
  });

  it('builds initials from up to two name parts', () => {
    expect(initialsFromName('João da Silva')).toBe('JD');
  });

  it('maps known statuses to labels', () => {
    expect(getAssociateStatusLabel('pendente_migracao')).toBe('Pendente migração');
    expect(getAssociateStatusLabel(null)).toBeNull();
  });

  it('computes elapsed years for valid dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));

    try {
      expect(yearsSinceDate('2020-01-01')).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
