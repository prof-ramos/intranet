import { describe, expect, it } from 'vitest';

/**
 * Urgency tier logic tests.
 *
 * The three-tier urgency system for activity due dates:
 *   isLate   = dueOffset < 0   (overdue)
 *   isUrgent = dueOffset === 0 (due today)
 *   isSoon   = dueOffset > 0 && dueOffset <= 3 (due within 1-3 days)
 *
 * All tiers are suppressed when status === 'concluido'.
 * All tiers return false when dueOffset === null.
 */
describe('activity urgency tiers', () => {
  function computeTiers(dueOffset: number | null, status: string) {
    const isLate = dueOffset !== null && dueOffset < 0 && status !== 'concluido';
    const isUrgent = dueOffset === 0 && status !== 'concluido';
    const isSoon = dueOffset !== null && dueOffset > 0 && dueOffset <= 3 && status !== 'concluido';
    return { isLate, isUrgent, isSoon };
  }

  it('overdue activity (dueOffset < 0) is late but not urgent or soon', () => {
    const tiers = computeTiers(-1, 'a_fazer');
    expect(tiers).toEqual({ isLate: true, isUrgent: false, isSoon: false });
  });

  it('due-today activity (dueOffset === 0) is urgent but not late or soon', () => {
    const tiers = computeTiers(0, 'a_fazer');
    expect(tiers).toEqual({ isLate: false, isUrgent: true, isSoon: false });
  });

  it('activity due in 1 day (dueOffset === 1) is soon but not late or urgent', () => {
    const tiers = computeTiers(1, 'em_andamento');
    expect(tiers).toEqual({ isLate: false, isUrgent: false, isSoon: true });
  });

  it('activity due in 3 days (dueOffset === 3) is soon', () => {
    const tiers = computeTiers(3, 'a_fazer');
    expect(tiers).toEqual({ isLate: false, isUrgent: false, isSoon: true });
  });

  it('activity due in 4 days (dueOffset === 4) is not any tier', () => {
    const tiers = computeTiers(4, 'a_fazer');
    expect(tiers).toEqual({ isLate: false, isUrgent: false, isSoon: false });
  });

  it('completed activity suppresses all tiers regardless of dueOffset', () => {
    expect(computeTiers(-1, 'concluido')).toEqual({ isLate: false, isUrgent: false, isSoon: false });
    expect(computeTiers(0, 'concluido')).toEqual({ isLate: false, isUrgent: false, isSoon: false });
    expect(computeTiers(1, 'concluido')).toEqual({ isLate: false, isUrgent: false, isSoon: false });
  });

  it('null dueOffset produces no tiers', () => {
    const tiers = computeTiers(null, 'a_fazer');
    expect(tiers).toEqual({ isLate: false, isUrgent: false, isSoon: false });
  });

  it('tiers are mutually exclusive', () => {
    // At most one tier should be true for any combination
    const offsets = [null, -5, -1, 0, 1, 2, 3, 4, 10];
    const statuses = ['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido'];
    for (const offset of offsets) {
      for (const status of statuses) {
        const { isLate, isUrgent, isSoon } = computeTiers(offset, status);
        const trueCount = [isLate, isUrgent, isSoon].filter(Boolean).length;
        expect(trueCount).toBeLessThanOrEqual(1);
      }
    }
  });
});