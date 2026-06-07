import { describe, it, expect } from 'vitest';
import { createEnumMetadata } from './create-enum-metadata';

const STATUSES = ['open', 'pending', 'closed'] as const;
type Status = (typeof STATUSES)[number];

const LABELS: Record<Status, string> = {
  open: 'Aberto',
  pending: 'Pendente',
  closed: 'Fechado',
};

const BADGES: Record<Status, string> = {
  open: 'bg-green-100',
  pending: 'bg-amber-100',
  closed: 'bg-slate-100',
};

describe('createEnumMetadata', () => {
  it('returns STATUSES array unchanged', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.STATUSES).toEqual(STATUSES);
  });

  it('returns LABELS record', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.LABELS).toEqual(LABELS);
  });

  it('builds OPTIONS from values and labels', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.OPTIONS).toEqual([
      { value: 'open', label: 'Aberto' },
      { value: 'pending', label: 'Pendente' },
      { value: 'closed', label: 'Fechado' },
    ]);
  });

  it('isStatus returns true for valid values', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.isStatus('open')).toBe(true);
    expect(meta.isStatus('pending')).toBe(true);
    expect(meta.isStatus('closed')).toBe(true);
  });

  it('isStatus returns false for invalid values', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.isStatus('invalid')).toBe(false);
    expect(meta.isStatus('')).toBe(false);
  });

  it('getLabel returns label for valid status', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.getLabel('open')).toBe('Aberto');
  });

  it('getLabel returns raw value for invalid status', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.getLabel('unknown')).toBe('unknown');
  });

  it('getBadgeClass returns badge for valid status when badges provided', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS, badges: BADGES });
    expect(meta.getBadgeClass('open')).toBe('bg-green-100');
  });

  it('getBadgeClass returns defaultBadge for unknown status', () => {
    const meta = createEnumMetadata({
      values: STATUSES,
      labels: LABELS,
      badges: BADGES,
      defaultBadge: 'fallback',
    });
    expect(meta.getBadgeClass('unknown')).toBe('fallback');
  });

  it('getBadgeClass returns defaultBadge for valid status without badge', () => {
    const meta = createEnumMetadata({
      values: STATUSES,
      labels: LABELS,
      badges: { open: 'bg-green-100' },
      defaultBadge: 'fallback',
    });
    expect(meta.getBadgeClass('pending')).toBe('fallback');
  });

  it('getBadgeClass returns empty string when no badges or defaultBadge', () => {
    const meta = createEnumMetadata({ values: STATUSES, labels: LABELS });
    expect(meta.getBadgeClass('open')).toBe('');
    expect(meta.getBadgeClass('unknown')).toBe('');
  });
});
