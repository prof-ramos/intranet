import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addCommentService,
  deleteCommentService,
  editCommentService,
  listCommentsService,
} from './comments-service';

const { txMock, activity, comment, insertedComment, dbMock } = vi.hoisted(() => {
  const activity = { id: 12 };
  const comment = {
    id: 7,
    activityId: 12,
    authorAdminId: 3,
    content: 'Comentário original',
    createdAt: new Date('2026-09-10T10:00:00.000Z'),
    updatedAt: new Date('2026-09-10T10:00:00.000Z'),
    deletedAt: null,
  };
  const insertedComment = { ...comment, content: 'Comentário novo' };
  const txMock = Symbol('tx');
  const dbMock = {
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(txMock)),
  };
  return { txMock, activity, comment, insertedComment, dbMock };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));

vi.mock('./repository', () => ({
  findActivityById: vi.fn(),
}));

vi.mock('./comments-repository', () => ({
  insertComment: vi.fn(),
  findCommentById: vi.fn(),
  findCommentsByActivityId: vi.fn(),
  updateComment: vi.fn(),
  softDeleteComment: vi.fn(),
}));

vi.mock('@/lib/audit/service', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/integrations/outbox', () => ({ emitDomainEvent: vi.fn() }));
vi.mock('@/lib/integrations/webhooks/service', () => ({
  dispatchDomainEventById: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

describe('activity comments service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const repository = await import('./repository');
    const commentsRepository = await import('./comments-repository');
    const audit = await import('@/lib/audit/service');
    const outbox = await import('@/lib/integrations/outbox');
    const webhooks = await import('@/lib/integrations/webhooks/service');
    vi.mocked(repository.findActivityById).mockResolvedValue(activity as never);
    vi.mocked(commentsRepository.findCommentById).mockResolvedValue(comment as never);
    vi.mocked(commentsRepository.findCommentsByActivityId).mockResolvedValue([comment] as never);
    vi.mocked(commentsRepository.insertComment).mockResolvedValue(insertedComment as never);
    vi.mocked(commentsRepository.updateComment).mockResolvedValue(insertedComment as never);
    vi.mocked(commentsRepository.softDeleteComment).mockResolvedValue({
      ...comment,
      deletedAt: new Date('2026-09-10T11:00:00.000Z'),
    } as never);
    vi.mocked(audit.logAuditAction).mockResolvedValue(undefined);
    vi.mocked(outbox.emitDomainEvent).mockResolvedValue({ id: 101 } as never);
    vi.mocked(webhooks.dispatchDomainEventById).mockResolvedValue({
      dispatched: false,
      reason: 'not_found',
    });
  });

  it('adds a normalized comment and records strict audit plus outbox event', async () => {
    const commentsRepository = await import('./comments-repository');
    const audit = await import('@/lib/audit/service');
    const outbox = await import('@/lib/integrations/outbox');
    const webhooks = await import('@/lib/integrations/webhooks/service');

    await expect(
      addCommentService({
        activityId: 12,
        authorAdminId: 3,
        content: '  Olá\u0000\t\n equipe  ',
      }),
    ).resolves.toEqual(insertedComment);

    expect(commentsRepository.insertComment).toHaveBeenCalledWith(
      { activityId: 12, authorAdminId: 3, content: 'Olá\n equipe' },
      txMock,
    );
    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.comment_added',
        entityType: 'activity',
        entityId: 12,
        actorAdminId: 3,
        payload: { commentId: 7, activityId: 12, authorAdminId: 3 },
      }),
      txMock,
    );
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'activity_comment_added',
        entityType: 'activity',
        entityId: 12,
        executor: txMock,
        changes: { old: {}, new: { contentLength: 11 } },
      }),
    );
    expect(webhooks.dispatchDomainEventById).toHaveBeenCalledWith(101);
  });

  it('rejects an empty comment', async () => {
    await expect(
      addCommentService({ activityId: 12, authorAdminId: 3, content: ' \u0000\t ' }),
    ).rejects.toThrow('obrigatório');
  });

  it('rejects a comment when the activity does not exist', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findActivityById).mockResolvedValue(null);

    await expect(
      addCommentService({ activityId: 999, authorAdminId: 3, content: 'Comentário' }),
    ).rejects.toThrow('Atividade não encontrado');
    expect(dbMock.transaction).not.toHaveBeenCalled();
  });

  it('prevents an administrator other than the author from editing', async () => {
    await expect(
      editCommentService({ commentId: 7, editorAdminId: 8, content: 'Tentativa' }),
    ).rejects.toThrow('autor');
    const commentsRepository = await import('./comments-repository');
    expect(commentsRepository.updateComment).not.toHaveBeenCalled();
  });

  it('edits an authored comment and emits the edited audit event', async () => {
    const commentsRepository = await import('./comments-repository');
    const audit = await import('@/lib/audit/service');

    await expect(
      editCommentService({ commentId: 7, editorAdminId: 3, content: '  Atualizado  ' }),
    ).resolves.toEqual(insertedComment);
    expect(commentsRepository.updateComment).toHaveBeenCalledWith(7, 'Atualizado', txMock);
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'activity_comment_edited', executor: txMock }),
    );
  });

  it('soft-deletes a comment and emits the deleted event', async () => {
    const commentsRepository = await import('./comments-repository');
    const outbox = await import('@/lib/integrations/outbox');
    const audit = await import('@/lib/audit/service');

    await deleteCommentService({ commentId: 7, actorAdminId: 8 });
    expect(commentsRepository.softDeleteComment).toHaveBeenCalledWith(7, txMock);
    expect(outbox.emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity.comment_deleted',
        payload: { commentId: 7, activityId: 12, authorAdminId: 3 },
      }),
      txMock,
    );
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'activity_comment_deleted', executor: txMock }),
    );
  });

  it('lists active comments for an activity', async () => {
    const commentsRepository = await import('./comments-repository');
    await expect(listCommentsService(12)).resolves.toEqual([comment]);
    expect(commentsRepository.findCommentsByActivityId).toHaveBeenCalledWith(12);
  });
});
