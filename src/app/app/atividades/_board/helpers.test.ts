import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultFilters } from './constants';
import {
  dateOnly,
  daysFromToday,
  filterActivities,
  formatDueDate,
  groupActivitiesByStatus,
  initials,
  normalizeActivity,
  summarizeActivities,
} from './helpers';
import type { BoardActivity, Filters } from './types';

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-05-11T12:00:00-03:00') });
});

afterEach(() => {
  vi.useRealTimers();
});

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function localDate(daysFromNow: number) {
  const date = todayStart();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function activity(overrides: Partial<BoardActivity> = {}): BoardActivity {
  return {
    id: 1,
    title: 'Preparar relatório',
    description: null,
    status: 'a_fazer',
    priority: 'normal',
    dueDate: null,
    completedAt: null,
    assigneeId: 10,
    assigneeName: 'Ana',
    associateId: 100,
    associateName: 'Associado A',
    tags: [],
    dueOffset: null,
    ...overrides,
  };
}

function filterWith(items: BoardActivity[], filters: Partial<Filters>, currentUserId = 10) {
  return filterActivities(items, { ...defaultFilters, ...filters }, currentUserId);
}

describe('activity board date helpers', () => {
  it('normalizes date-like strings to date-only values', () => {
    expect(dateOnly('2026-05-11T14:30:00.000Z')).toBe('2026-05-11');
    expect(dateOnly('2026-05-11 14:30:00')).toBe('2026-05-11');
    expect(dateOnly(null)).toBeNull();
  });

  it('calculates day offsets from the local start of today', () => {
    expect(daysFromToday(localDate(3))).toBe(3);
    expect(daysFromToday(localDate(-2))).toBe(-2);
    expect(daysFromToday(null)).toBeNull();
  });

  it('formats due dates for pt-BR compact display', () => {
    expect(formatDueDate('2026-05-11')).toBe('11 de mai');
    expect(formatDueDate(null)).toBeNull();
  });
});

describe('activity board normalization and initials', () => {
  it('builds initials from the first two words', () => {
    expect(initials('Maria Silva Ramos')).toBe('MS');
    expect(initials('  Ana  ')).toBe('A');
    expect(initials('   ')).toBe('');
  });

  it('normalizes dates, tags, and due offsets', () => {
    const normalized = normalizeActivity(
      activity({
        dueDate: `${localDate(1)}T12:00:00.000Z`,
        completedAt: '2026-05-12T00:00:00.000Z',
        tags: null as unknown as string[],
      }),
    );

    expect(normalized.dueDate).toBe(localDate(1));
    expect(normalized.completedAt).toBe('2026-05-12');
    expect(normalized.tags).toEqual([]);
    expect(normalized.dueOffset).toBe(1);
  });
});

describe('activity board filters', () => {
  const items = [
    activity({
      id: 1,
      title: 'Preparar relatório',
      assigneeId: 10,
      priority: 'normal',
      associateId: 100,
      dueOffset: 3,
    }),
    activity({
      id: 2,
      title: 'Cobrar documento',
      assigneeId: 20,
      priority: 'alta',
      associateId: 200,
      dueOffset: -1,
    }),
    activity({
      id: 3,
      title: 'Concluir ata',
      assigneeId: null,
      priority: 'urgente',
      associateId: null,
      dueOffset: 10,
    }),
    activity({
      id: 4,
      title: 'Arquivar processo',
      status: 'concluido',
      assigneeId: 10,
      priority: 'baixa',
      associateId: 100,
      dueOffset: -5,
    }),
  ];

  it('filters by current user scope and text query', () => {
    expect(filterWith(items, { scope: 'minhas' }).map((item) => item.id)).toEqual([1, 4]);
    expect(filterWith(items, { query: 'documento' }).map((item) => item.id)).toEqual([2]);
  });

  it('filters by assignee, priority, and associate', () => {
    expect(filterWith(items, { assignee: '20' }).map((item) => item.id)).toEqual([2]);
    expect(filterWith(items, { priority: 'urgente' }).map((item) => item.id)).toEqual([3]);
    expect(filterWith(items, { associate: '100' }).map((item) => item.id)).toEqual([1, 4]);
    expect(filterWith(items, { associate: '__any' }).map((item) => item.id)).toEqual([1, 2, 4]);
  });

  it('does not treat zero-like IDs as missing associated activities', () => {
    const zeroAssociate = activity({ id: 5, associateId: 0 });

    expect(filterWith([zeroAssociate], { associate: '__any' }).map((item) => item.id)).toEqual([5]);
  });

  it('filters due this week and overdue open activities', () => {
    expect(filterWith(items, { dueWeek: true }).map((item) => item.id)).toEqual([1]);
    expect(filterWith(items, { dueLate: true }).map((item) => item.id)).toEqual([2]);
  });
});

describe('activity board grouping', () => {
  it('groups activities by status preserving input order', () => {
    const grouped = groupActivitiesByStatus([
      activity({ id: 1, status: 'a_fazer' }),
      activity({ id: 2, status: 'concluido' }),
      activity({ id: 3, status: 'a_fazer' }),
    ]);

    expect(grouped.a_fazer.map((item) => item.id)).toEqual([1, 3]);
    expect(grouped.em_andamento).toEqual([]);
    expect(grouped.aguardando_terceiros).toEqual([]);
    expect(grouped.concluido.map((item) => item.id)).toEqual([2]);
  });

  it('throws for unknown runtime status values', () => {
    expect(() =>
      groupActivitiesByStatus([activity({ id: 9, status: 'desconhecido' as never })]),
    ).toThrow('invalid status "desconhecido" for activity 9');
  });
});

describe('activity board summary', () => {
  it('summarizes only the provided set and excludes completed items from late count', () => {
    const summary = summarizeActivities([
      activity({ id: 1, status: 'a_fazer', dueOffset: -2 }),
      activity({ id: 2, status: 'em_andamento', dueOffset: 1 }),
      activity({ id: 3, status: 'concluido', dueOffset: -5 }),
    ]);

    expect(summary).toEqual({
      byStatus: {
        a_fazer: 1,
        em_andamento: 1,
        aguardando_terceiros: 0,
        concluido: 1,
      },
      late: 1,
      total: 3,
    });
  });
});
