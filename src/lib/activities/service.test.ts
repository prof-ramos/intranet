/* eslint-disable @typescript-eslint/no-explicit-any -- test type coercion for invalid enum values */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createActivityService, updateActivityService } from './service';

vi.mock('./repository', () => ({
  insertActivity: vi.fn().mockResolvedValue({ id: 1 }),
  findActivityById: vi.fn(),
  updateActivityById: vi.fn(),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/events', () => ({
  emitActivityCompleted: vi.fn().mockResolvedValue(undefined),
  emitActivityAssigned: vi.fn().mockResolvedValue(undefined),
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

  it('throws for invalid priority', async () => {
    await expect(
      createActivityService({
        title: 'Title',
        description: null,
        status: 'a_fazer',
        priority: 'invalid_priority' as any,
        assigneeId: null,
        associateId: null,
        dueDate: null,
        tags: [],
        createdBy: 1,
      }),
    ).rejects.toThrow('Prioridade de atividade inválida.');
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

  it('throws for invalid due date', async () => {
    await expect(
      createActivityService({
        title: 'Title',
        description: null,
        status: 'a_fazer',
        priority: 'normal',
        assigneeId: null,
        associateId: null,
        dueDate: 'not-a-date',
        tags: [],
        createdBy: 1,
      }),
    ).rejects.toThrow('Data de vencimento inválida.');
  });

  it('throws for invalid assignee id', async () => {
    await expect(
      createActivityService({
        title: 'Title',
        description: null,
        status: 'a_fazer',
        priority: 'normal',
        assigneeId: 0,
        associateId: null,
        dueDate: null,
        tags: [],
        createdBy: 1,
      }),
    ).rejects.toThrow('Responsável inválido.');
  });

  it('throws for invalid associate id', async () => {
    await expect(
      createActivityService({
        title: 'Title',
        description: null,
        status: 'a_fazer',
        priority: 'normal',
        assigneeId: null,
        associateId: -1,
        dueDate: null,
        tags: [],
        createdBy: 1,
      }),
    ).rejects.toThrow('Associado inválido.');
  });

  it('normalizes and deduplicates tags before persisting', async () => {
    const repository = await import('./repository');
    await createActivityService({
      title: 'Title',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: [' Financeiro ', 'financeiro', 'TI!', ''],
      createdBy: 1,
    });
    expect(repository.insertActivity).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['financeiro', 'ti'] }),
    );
  });

  it('updates persisted activity fields and emits completion event on first completion', async () => {
    const repository = await import('./repository');
    const events = await import('@/lib/events');
    const audit = await import('@/lib/audit/service');
    vi.mocked(repository.findActivityById).mockResolvedValue({
      id: 8,
      title: 'Fechar ofício',
      description: null,
      status: 'em_andamento',
      priority: 'normal',
      assigneeId: 2,
      associateId: 3,
      dueDate: '2026-05-30T00:00:00.000Z',
      tags: [],
      createdBy: 1,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      completedAt: null,
      position: 1000,
    });
    vi.mocked(repository.updateActivityById).mockResolvedValue({
      id: 8,
      title: 'Fechar ofício',
      description: null,
      status: 'concluido',
      priority: 'alta',
      assigneeId: 2,
      associateId: 3,
      dueDate: null,
      tags: [],
      createdBy: 1,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      completedAt: new Date('2026-05-02T10:00:00.000Z'),
      position: 1000,
    });

    const result = await updateActivityService({
      id: 8,
      actorId: 7,
      status: 'concluido',
      priority: 'alta',
      dueDate: null,
    });

    expect(result.status).toBe('concluido');
    expect(repository.updateActivityById).toHaveBeenCalledWith(
      8,
      expect.objectContaining({
        status: 'concluido',
        priority: 'alta',
        dueDate: null,
      }),
    );
    expect(events.emitActivityCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 8,
        createdBy: 7,
      }),
    );
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'activity_updated',
        entityType: 'activity',
      }),
    );
  });

  it('updates assignee changes and stores reassignment metadata in audit log', async () => {
    const repository = await import('./repository');
    const audit = await import('@/lib/audit/service');
    vi.mocked(repository.findActivityById).mockResolvedValue({
      id: 9,
      title: 'Revisar documento',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: 7,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 1,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      completedAt: null,
      position: 1000,
    });
    vi.mocked(repository.updateActivityById).mockResolvedValue({
      id: 9,
      title: 'Revisar documento',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: 12,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 1,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      completedAt: null,
      position: 1000,
    });

    await updateActivityService({
      id: 9,
      actorId: 7,
      assigneeId: 12,
      reassignmentMessage: 'Assumir retorno com a diretoria',
    });

    expect(repository.updateActivityById).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ assigneeId: 12 }),
    );
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { reassignmentMessage: 'Assumir retorno com a diretoria' },
        changes: expect.objectContaining({
          old: expect.objectContaining({ assigneeId: 7 }),
          new: expect.objectContaining({ assigneeId: 12 }),
        }),
      }),
    );
  });

  it('rejects updates for missing activities', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findActivityById).mockResolvedValue(null);

    await expect(
      updateActivityService({
        id: 999,
        actorId: 7,
        status: 'a_fazer',
      }),
    ).rejects.toThrow('Atividade não encontrada.');
  });
});
