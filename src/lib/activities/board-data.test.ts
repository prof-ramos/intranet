import { describe, expect, it } from 'vitest';
import { mapActivityRowToBoardActivity } from '@/lib/activities/repository';

describe('mapActivityRowToBoardActivity', () => {
  it('maps nullable tags to an empty array and serializes completedAt', () => {
    const result = mapActivityRowToBoardActivity({
      id: 1,
      title: 'Atividade',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      dueDate: '2026-05-11T00:00:00.000Z',
      completedAt: new Date('2026-05-12T10:00:00.000Z'),
      assigneeId: 2,
      assigneeName: 'Maria',
      associateId: 3,
      associateName: 'João',
      tags: null,
    });

    expect(result).toEqual({
      id: 1,
      title: 'Atividade',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      dueDate: '2026-05-11T00:00:00.000Z',
      completedAt: '2026-05-12T10:00:00.000Z',
      assigneeId: 2,
      assigneeName: 'Maria',
      associateId: 3,
      associateName: 'João',
      tags: [],
      dueOffset: null,
    });
  });
});