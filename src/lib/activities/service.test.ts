/* eslint-disable @typescript-eslint/no-explicit-any -- test type coercion for invalid enum values */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createActivityService } from './service';

vi.mock('./repository', () => ({
  insertActivity: vi.fn().mockResolvedValue({ id: 1 }),
}));

describe('activities service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an activity with valid input', async () => {
    const repository = await import('./repository');
    const result = await createActivityService({
      title: '  Valid title  ',
      description: '  desc  ',
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 1,
    });
    expect(result).toEqual({ id: 1 });
    expect(repository.insertActivity).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Valid title', description: 'desc' }),
    );
  });

  it('throws when title is empty', async () => {
    await expect(
      createActivityService({
        title: '   ',
        description: null,
        status: 'a_fazer',
        priority: 'normal',
        assigneeId: null,
        associateId: null,
        dueDate: null,
        tags: [],
        createdBy: 1,
      }),
    ).rejects.toThrow('O título da atividade é obrigatório.');
  });

  it('throws when title exceeds 255 characters', async () => {
    await expect(
      createActivityService({
        title: 'a'.repeat(256),
        description: null,
        status: 'a_fazer',
        priority: 'normal',
        assigneeId: null,
        associateId: null,
        dueDate: null,
        tags: [],
        createdBy: 1,
      }),
    ).rejects.toThrow('O título não pode exceder 255 caracteres.');
  });

  it('throws for invalid status', async () => {
    await expect(
      createActivityService({
        title: 'Title',
        description: null,
        status: 'invalid_status' as any,
        priority: 'normal',
        assigneeId: null,
        associateId: null,
        dueDate: null,
        tags: [],
        createdBy: 1,
      }),
    ).rejects.toThrow('Status de atividade inválido.');
  });

  it('throws for invalid createdBy', async () => {
    await expect(
      createActivityService({
        title: 'Title',
        description: null,
        status: 'a_fazer',
        priority: 'normal',
        assigneeId: null,
        associateId: null,
        dueDate: null,
        tags: [],
        createdBy: NaN,
      }),
    ).rejects.toThrow('Usuário criador inválido.');
  });

  it('converts whitespace-only description to null', async () => {
    const repository = await import('./repository');
    await createActivityService({
      title: 'Title',
      description: '   ',
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 1,
    });
    expect(repository.insertActivity).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });
});