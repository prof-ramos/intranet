import { describe, expect, it } from 'vitest';
import {
  normalizeActivity,
  filterActivities,
  groupActivitiesByStatus,
  deriveCompletedAt,
} from '@/lib/activities/transformations';
import type { BoardActivity, Filters } from '@/lib/activities/types';

function makeActivity(overrides: Partial<BoardActivity> = {}): BoardActivity {
  return {
    id: 1,
    title: 'Test activity',
    description: null,
    status: 'a_fazer',
    priority: 'normal',
    dueDate: '2026-06-15',
    completedAt: null,
    assigneeId: 10,
    assigneeName: 'Admin',
    associateId: 20,
    associateName: 'João',
    tags: [],
    dueOffset: 3,
    ...overrides,
  };
}

describe('normalizeActivity', () => {
  it('normalizes date fields and tags', () => {
    const activity = makeActivity({
      dueDate: '2026-06-15T10:00:00.000Z',
      completedAt: '2026-06-14T00:00:00.000Z',
      tags: ['tag1', 'tag2'],
    });
    const result = normalizeActivity(activity);
    expect(result.dueDate).toBe('2026-06-15');
    expect(result.completedAt).toBe('2026-06-14');
    expect(result.tags).toEqual(['tag1', 'tag2']);
  });

  it('handles null tags', () => {
    const activity = makeActivity({ tags: null as unknown as string[] });
    const result = normalizeActivity(activity);
    expect(result.tags).toEqual([]);
  });

  it('handles null dates', () => {
    const activity = makeActivity({ dueDate: null, completedAt: null });
    const result = normalizeActivity(activity);
    expect(result.dueDate).toBeNull();
    expect(result.completedAt).toBeNull();
    expect(result.dueOffset).toBeNull();
  });
});

describe('filterActivities', () => {
  const defaultFilters: Filters = {
    scope: 'todas',
    query: '',
    assignee: '',
    priority: '',
    associate: '',
    dueWeek: false,
    dueLate: false,
    openOnly: false,
  };

  it('returns all activities with default filters', () => {
    const activities = [makeActivity({ id: 1 }), makeActivity({ id: 2 })];
    const result = filterActivities(activities, defaultFilters, 10);
    expect(result).toHaveLength(2);
  });

  it('filters by scope "minhas"', () => {
    const activities = [
      makeActivity({ id: 1, assigneeId: 10 }),
      makeActivity({ id: 2, assigneeId: 20 }),
    ];
    const result = filterActivities(activities, { ...defaultFilters, scope: 'minhas' }, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by query', () => {
    const activities = [
      makeActivity({ id: 1, title: 'Reunião de diretoria' }),
      makeActivity({ id: 2, title: 'Relatório financeiro' }),
    ];
    const result = filterActivities(activities, { ...defaultFilters, query: 'reunião' }, 10);
    expect(result).toHaveLength(1);
    expect(result[0].title).toContain('Reunião');
  });

  it('filters by priority', () => {
    const activities = [
      makeActivity({ id: 1, priority: 'urgente' }),
      makeActivity({ id: 2, priority: 'normal' }),
    ];
    const result = filterActivities(activities, { ...defaultFilters, priority: 'urgente' }, 10);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe('urgente');
  });

  it('filters by dueWeek', () => {
    const activities = [
      makeActivity({ id: 1, dueOffset: 3, status: 'a_fazer' }),
      makeActivity({ id: 2, dueOffset: null, status: 'a_fazer' }),
      makeActivity({ id: 3, dueOffset: -5, status: 'a_fazer' }),
    ];
    const result = filterActivities(activities, { ...defaultFilters, dueWeek: true }, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by dueLate', () => {
    const activities = [
      makeActivity({ id: 1, dueOffset: -3, status: 'a_fazer' }),
      makeActivity({ id: 2, dueOffset: 5, status: 'a_fazer' }),
      makeActivity({ id: 3, dueOffset: -1, status: 'concluido' }),
    ];
    const result = filterActivities(activities, { ...defaultFilters, dueLate: true }, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by associate with __any', () => {
    const activities = [
      makeActivity({ id: 1, associateId: 20 }),
      makeActivity({ id: 2, associateId: null }),
    ];
    const result = filterActivities(activities, { ...defaultFilters, associate: '__any' }, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by specific associate id', () => {
    const activities = [
      makeActivity({ id: 1, associateId: 20 }),
      makeActivity({ id: 2, associateId: 30 }),
    ];
    const result = filterActivities(activities, { ...defaultFilters, associate: '20' }, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters the board to activities that are still open', () => {
    const activities = [
      makeActivity({ id: 1, status: 'a_fazer' }),
      makeActivity({ id: 2, status: 'em_andamento' }),
      makeActivity({ id: 3, status: 'concluido' }),
    ];

    const result = filterActivities(activities, { ...defaultFilters, openOnly: true }, 10);

    expect(result.map((activity) => activity.id)).toEqual([1, 2]);
  });

  it('does not treat non-decimal filter ids as valid matches', () => {
    const activities = [
      makeActivity({ id: 1, assigneeId: 100, associateId: 16 }),
      makeActivity({ id: 2, assigneeId: 10, associateId: 20 }),
    ];

    expect(filterActivities(activities, { ...defaultFilters, assignee: '1e2' }, 10)).toHaveLength(
      2,
    );
    expect(filterActivities(activities, { ...defaultFilters, associate: '0x10' }, 10)).toHaveLength(
      2,
    );
  });
});

describe('groupActivitiesByStatus', () => {
  it('groups activities by status', () => {
    const activities = [
      makeActivity({ id: 1, status: 'a_fazer' }),
      makeActivity({ id: 2, status: 'em_andamento' }),
      makeActivity({ id: 3, status: 'a_fazer' }),
    ];
    const result = groupActivitiesByStatus(activities);
    expect(result.a_fazer).toHaveLength(2);
    expect(result.em_andamento).toHaveLength(1);
    expect(result.aguardando_terceiros).toHaveLength(0);
    expect(result.concluido).toHaveLength(0);
  });

  it('throws on invalid status', () => {
    const activity = makeActivity({ status: 'invalid' as BoardActivity['status'] });
    expect(() => groupActivitiesByStatus([activity])).toThrow(/invalid status/);
  });
});

describe('deriveCompletedAt', () => {
  it('returns today when transitioning to concluido with no prior completedAt', () => {
    const result = deriveCompletedAt('concluido', 'a_fazer', null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('preserves existing completedAt when transitioning to concluido again', () => {
    const result = deriveCompletedAt('concluido', 'em_andamento', '2026-05-01');
    expect(result).toBe('2026-05-01');
  });

  it('clears completedAt when moving away from concluido', () => {
    const result = deriveCompletedAt('a_fazer', 'concluido', '2026-05-01');
    expect(result).toBeNull();
  });

  it('keeps existing completedAt when neither status is concluido', () => {
    const result = deriveCompletedAt('em_andamento', 'a_fazer', null);
    expect(result).toBeNull();
  });
});
