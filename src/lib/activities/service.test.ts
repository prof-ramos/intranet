/* eslint-disable @typescript-eslint/no-explicit-any -- test type coercion for invalid enum values */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createActivityService, updateActivityService } from './service';

// vi.hoisted garante que estas referências existam antes dos vi.mock() (hoisting
// de mocks do Vitest). Padrão obrigatório da repo para mockar Drizzle/services.
const { txMock, createdRow } = vi.hoisted(() => ({
  // Symbol como executor sentinel: comparável por referência em toHaveBeenCalledWith.
  txMock: Symbol('tx'),
  createdRow: {
    id: 1,
    title: 'Valid title',
    description: 'desc',
    status: 'a_fazer' as const,
    priority: 'normal' as const,
    assigneeId: null,
    associateId: null,
    dueDate: null,
    tags: [],
    createdBy: 1,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    completedAt: null,
    position: 1000,
  },
}));

vi.mock('@/lib/db', () => ({
  // Executa o callback da transação de forma síncrona com o txMock sentinel,
  // preservando semântica de propagação de throw/reject.
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(txMock)),
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock('./repository', () => ({
  insertActivity: vi.fn().mockResolvedValue(createdRow),
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

vi.mock('./domain-events', () => ({
  emitActivityDomainEvents: vi.fn().mockResolvedValue([]),
  toIsoDate: vi.fn((value: Date | string | null | undefined) => {
    if (value == null) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn().mockResolvedValue({ id: 100 }),
}));

vi.mock('@/lib/integrations/webhooks/service', () => ({
  dispatchDomainEventById: vi.fn().mockResolvedValue(undefined),
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
    expect(result).toEqual(createdRow);
    expect(repository.insertActivity).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Valid title', description: 'desc' }),
      txMock,
    );
  });

  it('emits activity.created domain event inside the tx and dispatches inline', async () => {
    const outbox = await import('@/lib/integrations/outbox');
    const webhooks = await import('@/lib/integrations/webhooks/service');

    await createActivityService({
      title: 'Title',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 1,
    });

    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.created',
        entityType: 'activity',
        entityId: 1,
        actorAdminId: 1,
        payload: expect.objectContaining({
          activityId: 1,
          status: 'a_fazer',
          createdById: 1,
          links: { app: '/app/atividades/1' },
        }),
      }),
      txMock,
    );
    // Dispatch fire-and-forget após commit.
    expect(webhooks.dispatchDomainEventById).toHaveBeenCalledWith(100);
  });

  it('swallows inline dispatch failure on create (fire-and-forget, mutation still succeeds)', async () => {
    const webhooks = await import('@/lib/integrations/webhooks/service');
    vi.mocked(webhooks.dispatchDomainEventById).mockRejectedValueOnce(new Error('network down'));

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
        createdBy: 1,
      }),
    ).resolves.toEqual(createdRow);
  });

  it('runs audit OUTSIDE the tx on create (no executor: tx) so audit failure cannot abort the mutation', async () => {
    const audit = await import('@/lib/audit/service');
    await createActivityService({
      title: 'Title',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 1,
    });
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'activity_created', entityType: 'activity' }),
    );
    // Sem `executor: tx` → auditoria usa default `db` (fora da tx). Garante
    // que falha de INSERT de auditoria não deixe a tx em estado aborted.
    const callArgs = vi.mocked(audit.logAuditAction).mock.calls[0][0];
    expect(callArgs.executor).toBeUndefined();
  });

  it('runs audit OUTSIDE the tx on update (no executor: tx) so audit failure cannot abort the mutation', async () => {
    const repository = await import('./repository');
    const audit = await import('@/lib/audit/service');
    vi.mocked(repository.findActivityById).mockResolvedValue({
      id: 8,
      title: 'Fechar ofício',
      description: null,
      status: 'em_andamento',
      priority: 'normal',
      assigneeId: 2,
      associateId: 3,
      dueDate: null,
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
      priority: 'normal',
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

    await updateActivityService({ id: 8, actorId: 7, status: 'concluido' });

    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'activity_updated', entityType: 'activity' }),
    );
    // Sem `executor: tx` → auditoria usa default `db` (fora da tx).
    const callArgs = vi.mocked(audit.logAuditAction).mock.calls.find(
      (call) => call[0].action === 'activity_updated',
    )?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs?.executor).toBeUndefined();
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
      txMock,
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
      txMock,
    );
  });

  it('updates persisted activity fields and emits completion event on first completion', async () => {
    const repository = await import('./repository');
    const events = await import('@/lib/events');
    const audit = await import('@/lib/audit/service');
    const domainEvents = await import('./domain-events');
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
      new Date('2026-05-01T00:00:00.000Z'),
      txMock,
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
    // Helper canônico de eventos outbox é invocado dentro da tx com o snapshot
    // anterior e o estado atualizado.
    expect(domainEvents.emitActivityDomainEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 7,
        current: expect.objectContaining({ id: 8 }),
        updated: expect.objectContaining({ id: 8, status: 'concluido' }),
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
      new Date('2026-05-01T00:00:00.000Z'),
      txMock,
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

  it('swallows in-app completion notification failure (best-effort, mutation still succeeds)', async () => {
    const repository = await import('./repository');
    const events = await import('@/lib/events');
    vi.mocked(repository.findActivityById).mockResolvedValue({
      id: 8,
      title: 'Fechar ofício',
      description: null,
      status: 'em_andamento',
      priority: 'normal',
      assigneeId: 2,
      associateId: 3,
      dueDate: null,
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
      priority: 'normal',
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
    vi.mocked(events.emitActivityCompleted).mockRejectedValueOnce(new Error('notification down'));

    await expect(
      updateActivityService({ id: 8, actorId: 7, status: 'concluido' }),
    ).resolves.toMatchObject({ id: 8, status: 'concluido' });
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

  it('rejects updates when optimistic concurrency detects a stale activity and emits no outbox events', async () => {
    const repository = await import('./repository');
    const domainEvents = await import('./domain-events');
    const outbox = await import('@/lib/integrations/outbox');
    const webhooks = await import('@/lib/integrations/webhooks/service');
    vi.mocked(repository.findActivityById).mockResolvedValue({
      id: 10,
      title: 'Conferir ata',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: null,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 1,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      completedAt: null,
      position: 1000,
    });
    vi.mocked(repository.updateActivityById).mockResolvedValue(null);

    await expect(
      updateActivityService({
        id: 10,
        actorId: 1,
        status: 'em_andamento',
      }),
    ).rejects.toThrow('CONCURRENCY_CONFLICT');

    // Nenhum evento fantasma no outbox: o throw acontece ANTES do helper e do
    // emitDomainEvent. Dispatch inline também não roda.
    expect(domainEvents.emitActivityDomainEvents).not.toHaveBeenCalled();
    expect(outbox.emitDomainEvent).not.toHaveBeenCalled();
    expect(webhooks.dispatchDomainEventById).not.toHaveBeenCalled();
  });
});