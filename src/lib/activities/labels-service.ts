import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { logAuditAction } from '@/lib/audit/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { dispatchDomainEventById } from '@/lib/integrations/webhooks/service';
import { createLogger } from '@/lib/logger';
import { findActivityById } from './repository';
import {
  assignLabelToActivity,
  deactivateLabel,
  findActiveLabels,
  findLabelBySlug,
  insertLabel,
  removeLabelFromActivity,
} from './labels-repository';
import type { ActivityLabel } from '@/lib/db/schema/activity-labels';

type AuditChanges = Parameters<typeof logAuditAction>[0]['changes'];

const logger = createLogger('activities:labels-service');

function assertLabelsEnabled(): void {
  if (!env.ACTIVITY_LABELS_ENABLED) {
    throw new ValidationError('Labels de atividades estão desabilitadas.');
  }
}

function dispatchLabelEvent(eventId: number, eventType: string): void {
  void dispatchDomainEventById(eventId).catch((error) => {
    logger.error(`inline dispatch failed (${eventType})`, { eventId, error });
  });
}

interface CreateLabelInput {
  name: string;
  colorToken: string;
  createdBy: number;
}

interface DeactivateLabelInput {
  id: number;
  actorId: number;
}

interface ActivityLabelMutationInput {
  activityId: number;
  labelId: number;
  actorId: number;
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${fieldName} inválido.`);
  }
}

function generateLabelSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function newOnlyChanges(value: Record<string, unknown>): AuditChanges {
  // The labels audit contract records the new state only. The shared audit
  // schema also supports an optional old state, so keep this narrow payload
  // compatible with the existing logger type.
  return { new: value } as AuditChanges;
}

export async function listLabelsService(): Promise<ActivityLabel[]> {
  assertLabelsEnabled();
  return findActiveLabels();
}

export async function createLabelService(input: CreateLabelInput) {
  assertLabelsEnabled();
  if (typeof input.name !== 'string') {
    throw new ValidationError('Nome do rótulo inválido.');
  }

  const name = input.name.trim();
  if (name.length < 1 || name.length > 64) {
    throw new ValidationError('O nome do rótulo deve ter entre 1 e 64 caracteres.');
  }
  if (typeof input.colorToken !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(input.colorToken)) {
    throw new ValidationError('A cor do rótulo deve estar no formato hexadecimal #RRGGBB.');
  }
  assertPositiveInteger(input.createdBy, 'Usuário criador');

  const slug = generateLabelSlug(name);
  if (!slug) {
    throw new ValidationError('O nome do rótulo não gera um slug válido.');
  }

  return db.transaction(async (tx) => {
    const existing = await findLabelBySlug(slug, tx);
    if (existing) {
      throw new ValidationError('Já existe um rótulo com esse slug.');
    }

    const created = await insertLabel({ name, slug, colorToken: input.colorToken }, tx);
    if (!created) {
      throw new Error('Falha ao criar rótulo.');
    }

    await logAuditAction({
      adminId: input.createdBy,
      action: 'activity_label_created',
      entityType: 'activity',
      entityId: null,
      changes: newOnlyChanges({ name, slug, colorToken: input.colorToken }),
      executor: tx,
    });

    return created;
  });
}

export async function deactivateLabelService(input: DeactivateLabelInput) {
  assertLabelsEnabled();
  assertPositiveInteger(input.id, 'Rótulo');
  assertPositiveInteger(input.actorId, 'Usuário responsável');

  return db.transaction(async (tx) => {
    const deactivated = await deactivateLabel(input.id, tx);
    if (!deactivated) {
      throw new NotFoundError('Rótulo');
    }

    await logAuditAction({
      adminId: input.actorId,
      action: 'activity_label_deactivated',
      entityType: 'activity',
      entityId: input.id,
      changes: newOnlyChanges({ active: false }),
      executor: tx,
    });

    return deactivated;
  });
}

export async function addLabelToActivityService(input: ActivityLabelMutationInput) {
  assertLabelsEnabled();
  assertPositiveInteger(input.activityId, 'Atividade');
  assertPositiveInteger(input.labelId, 'Rótulo');
  assertPositiveInteger(input.actorId, 'Usuário responsável');

  const { assignment, eventId } = await db.transaction(async (tx) => {
    const activity = await findActivityById(input.activityId, tx);
    if (!activity) {
      throw new NotFoundError('Atividade');
    }

    const activeLabels = await findActiveLabels(tx);
    const labelIsActive = activeLabels.some((label) => label.id === input.labelId);
    if (!labelIsActive) {
      throw new ValidationError('O rótulo não está ativo.');
    }

    const assignment = await assignLabelToActivity(
      input.activityId,
      input.labelId,
      input.actorId,
      tx,
    );
    if (!assignment) {
      throw new Error('Falha ao associar rótulo à atividade.');
    }

    const event = await emitDomainEvent(
      {
        type: 'activity.label_added',
        entityType: 'activity',
        entityId: input.activityId,
        actorAdminId: input.actorId,
        payload: {
          activityId: input.activityId,
          labelId: input.labelId,
        },
      },
      tx,
    );

    await logAuditAction({
      adminId: input.actorId,
      action: 'activity_label_added',
      entityType: 'activity',
      entityId: input.activityId,
      changes: newOnlyChanges({ labelId: input.labelId }),
      executor: tx,
    });

    return { assignment, eventId: event.id };
  });

  dispatchLabelEvent(eventId, 'activity.label_added');
  return assignment;
}

export async function removeLabelFromActivityService(input: ActivityLabelMutationInput) {
  assertLabelsEnabled();
  assertPositiveInteger(input.activityId, 'Atividade');
  assertPositiveInteger(input.labelId, 'Rótulo');
  assertPositiveInteger(input.actorId, 'Usuário responsável');

  const { removed, eventId } = await db.transaction(async (tx) => {
    const removed = await removeLabelFromActivity(input.activityId, input.labelId, tx);
    if (!removed) {
      throw new NotFoundError('Rótulo associado à atividade');
    }

    const event = await emitDomainEvent(
      {
        type: 'activity.label_removed',
        entityType: 'activity',
        entityId: input.activityId,
        actorAdminId: input.actorId,
        payload: {
          activityId: input.activityId,
          labelId: input.labelId,
        },
      },
      tx,
    );

    await logAuditAction({
      adminId: input.actorId,
      action: 'activity_label_removed',
      entityType: 'activity',
      entityId: input.activityId,
      changes: newOnlyChanges({ labelId: input.labelId }),
      executor: tx,
    });

    return { removed, eventId: event.id };
  });

  dispatchLabelEvent(eventId, 'activity.label_removed');
  return removed;
}
