import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logAuditAction } from '@/lib/audit/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { dispatchDomainEventById } from '@/lib/integrations/webhooks/service';
import { createLogger } from '@/lib/logger';
import { findActivityById } from './repository';
import {
  findCommentById,
  findCommentsByActivityId,
  insertComment,
  softDeleteComment,
  updateComment,
} from './comments-repository';
import type { ActivityComment } from '@/lib/db/schema';

const logger = createLogger('activities:comments-service');
const MAX_COMMENT_LENGTH = 10_000;

function assertCommentsEnabled(): void {
  if (!env.ACTIVITY_COMMENTS_ENABLED) {
    throw new ValidationError('Comentários de atividades estão desabilitados.');
  }
}

export interface AddCommentInput {
  activityId: number;
  authorAdminId: number;
  content: string;
}

export interface EditCommentInput {
  commentId: number;
  editorAdminId: number;
  content: string;
}

export interface DeleteCommentInput {
  commentId: number;
  actorAdminId: number;
}

function assertPositiveInteger(value: number, message: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new ValidationError(message);
}

function normalizeCommentContent(content: string): string {
  if (typeof content !== 'string') {
    throw new ValidationError('O comentário é obrigatório.');
  }

  const normalized = content.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
  if (!normalized) throw new ValidationError('O comentário é obrigatório.');
  if (normalized.length > MAX_COMMENT_LENGTH) {
    throw new ValidationError('O comentário não pode exceder 10.000 caracteres.');
  }
  return normalized;
}

async function requireCommentWithActivity(commentId: number) {
  assertPositiveInteger(commentId, 'Comentário inválido.');
  const comment = await findCommentById(commentId);
  if (!comment) throw new NotFoundError('Comentário');

  const activity = await findActivityById(comment.activityId);
  if (!activity) throw new NotFoundError('Atividade');
  return { comment, activity };
}

function dispatchCommentEvent(eventId: number, eventType: string): void {
  void dispatchDomainEventById(eventId).catch((error) => {
    logger.error(`inline dispatch failed (${eventType})`, { eventId, error });
  });
}

export async function addCommentService(input: AddCommentInput): Promise<ActivityComment> {
  assertCommentsEnabled();
  assertPositiveInteger(input.activityId, 'Atividade inválida.');
  assertPositiveInteger(input.authorAdminId, 'Autor do comentário inválido.');
  const content = normalizeCommentContent(input.content);

  const activity = await findActivityById(input.activityId);
  if (!activity) throw new NotFoundError('Atividade');

  const { comment, eventId } = await db.transaction(async (tx) => {
    const inserted = await insertComment(
      {
        activityId: input.activityId,
        authorAdminId: input.authorAdminId,
        content,
      },
      tx,
    );
    const event = await emitDomainEvent(
      {
        type: 'activity.comment_added',
        entityType: 'activity',
        entityId: input.activityId,
        actorAdminId: input.authorAdminId,
        payload: {
          commentId: inserted.id,
          activityId: input.activityId,
          authorAdminId: input.authorAdminId,
        },
      },
      tx,
    );
    await logAuditAction({
      adminId: input.authorAdminId,
      action: 'activity_comment_added',
      entityType: 'activity',
      entityId: input.activityId,
      changes: { old: {}, new: { contentLength: content.length } },
      executor: tx,
    });
    return { comment: inserted, eventId: event.id };
  });

  dispatchCommentEvent(eventId, 'activity.comment_added');
  return comment;
}

export async function editCommentService(input: EditCommentInput): Promise<ActivityComment> {
  assertCommentsEnabled();
  assertPositiveInteger(input.editorAdminId, 'Editor do comentário inválido.');
  const { comment } = await requireCommentWithActivity(input.commentId);

  if (comment.authorAdminId !== input.editorAdminId) {
    throw new ValidationError('Somente o autor pode editar o comentário.');
  }

  const content = normalizeCommentContent(input.content);

  const { updated, eventId } = await db.transaction(async (tx) => {
    const changed = await updateComment(input.commentId, content, tx);
    if (!changed) throw new NotFoundError('Comentário');

    const event = await emitDomainEvent(
      {
        type: 'activity.comment_edited',
        entityType: 'activity',
        entityId: comment.activityId,
        actorAdminId: input.editorAdminId,
        payload: {
          commentId: changed.id,
          activityId: comment.activityId,
          authorAdminId: comment.authorAdminId,
        },
      },
      tx,
    );
    await logAuditAction({
      adminId: input.editorAdminId,
      action: 'activity_comment_edited',
      entityType: 'activity',
      entityId: comment.activityId,
      changes: {
        old: { contentLength: comment.content.length },
        new: { contentLength: content.length },
      },
      executor: tx,
    });
    return { updated: changed, eventId: event.id };
  });

  dispatchCommentEvent(eventId, 'activity.comment_edited');
  return updated;
}

export async function deleteCommentService(input: DeleteCommentInput): Promise<ActivityComment> {
  assertCommentsEnabled();
  assertPositiveInteger(input.actorAdminId, 'Exclusor do comentário inválido.');
  const { comment } = await requireCommentWithActivity(input.commentId);

  if (comment.authorAdminId !== input.actorAdminId) {
    throw new ValidationError('Somente o autor pode excluir o comentário.');
  }

  const { deleted, eventId } = await db.transaction(async (tx) => {
    const changed = await softDeleteComment(input.commentId, tx);
    if (!changed) throw new NotFoundError('Comentário');

    const event = await emitDomainEvent(
      {
        type: 'activity.comment_deleted',
        entityType: 'activity',
        entityId: comment.activityId,
        actorAdminId: input.actorAdminId,
        payload: {
          commentId: changed.id,
          activityId: comment.activityId,
          authorAdminId: comment.authorAdminId,
        },
      },
      tx,
    );
    await logAuditAction({
      adminId: input.actorAdminId,
      action: 'activity_comment_deleted',
      entityType: 'activity',
      entityId: comment.activityId,
      changes: { old: { contentLength: comment.content.length }, new: { deleted: true } },
      executor: tx,
    });
    return { deleted: changed, eventId: event.id };
  });

  dispatchCommentEvent(eventId, 'activity.comment_deleted');
  return deleted;
}

export async function listCommentsService(activityId: number): Promise<ActivityComment[]> {
  assertCommentsEnabled();
  assertPositiveInteger(activityId, 'Atividade inválida.');
  const activity = await findActivityById(activityId);
  if (!activity) throw new NotFoundError('Atividade');
  return findCommentsByActivityId(activityId);
}
