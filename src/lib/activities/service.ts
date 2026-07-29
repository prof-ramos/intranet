import { isActivityPriority, isActivityStatus } from './status';
import type { Priority, Status } from './types';
import { deriveCompletedAt } from './transformations';
import { findActivityById, insertActivity, updateActivityById } from './repository';
import { logAuditBestEffort } from '@/lib/audit/service';
import { emitActivityAssigned, emitActivityCompleted } from '@/lib/events';
import { emitActivityDomainEvents, toIsoDate } from './domain-events';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { dispatchDomainEventById } from '@/lib/integrations/webhooks/service';
import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { ConcurrencyConflictError, NotFoundError, ValidationError } from '@/lib/errors';

const logger = createLogger('activities:service');

interface CreateActivityInput {
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assigneeId: number | null;
  associateId: number | null;
  dueDate: string | null;
  tags: string[];
  createdBy: number;
}

interface UpdateActivityInput {
  id: number;
  actorId: number;
  status?: Status;
  priority?: Priority;
  dueDate?: string | null;
  assigneeId?: number | null;
  reassignmentMessage?: string | null;
}

function isValidOptionalId(value: number | null): boolean {
  return value == null || (Number.isInteger(value) && value > 0);
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) =>
          tag
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, ''),
        )
        .filter((tag) => tag.length > 0),
    ),
  );
}

export async function createActivityService(input: CreateActivityInput) {
  if (!input.title.trim()) {
    throw new ValidationError('O título da atividade é obrigatório.');
  }
  if (input.title.length > 255) {
    throw new ValidationError('O título não pode exceder 255 caracteres.');
  }
  if (!isActivityStatus(input.status)) {
    throw new ValidationError('Status de atividade inválido.');
  }
  if (!isActivityPriority(input.priority)) {
    throw new ValidationError('Prioridade de atividade inválida.');
  }
  if (!isValidOptionalId(input.assigneeId)) {
    throw new ValidationError('Responsável inválido.');
  }
  if (!isValidOptionalId(input.associateId)) {
    throw new ValidationError('Associado inválido.');
  }
  if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
    throw new ValidationError('Data de vencimento inválida.');
  }
  if (input.createdBy == null || Number.isNaN(input.createdBy)) {
    throw new ValidationError('Usuário criador inválido.');
  }

  const normalizedTags = normalizeTags(input.tags);

  // Mutação + evento outbox commitam juntos na mesma transação (atomicidade
  // all-or-nothing — ADR 013/018). A auditoria é perna best-effort FORA da tx
  // (default `db`, sem `executor: tx`): assim uma falha de INSERT de auditoria
  // não deixa a tx Postgres em estado `aborted` e não rollbacka a mutação
  // (padrão majoritário do repo — cf. `oficios/service.ts` create/update).
  // Tradeoff aceito: se a tx rollbackar, o registro de auditoria já commitado
  // vira órfão (audit de uma ação que não persistiu) — mesmo tradeoff do
  // precedent. `logAuditBestEffort` engole erros (inclusive adminId inválido),
  // então não propaga.
  const { row: created, eventId } = await db.transaction(async (tx) => {
    const row = await insertActivity(
      {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status,
        priority: input.priority,
        assigneeId: input.assigneeId,
        associateId: input.associateId,
        dueDate: input.dueDate,
        tags: normalizedTags,
        createdBy: input.createdBy,
      },
      tx,
    );

    const event = await emitDomainEvent(
      {
        type: 'activity.created',
        entityType: 'activity',
        entityId: row.id,
        actorAdminId: input.createdBy,
        payload: {
          activityId: row.id,
          status: row.status,
          priority: row.priority,
          assigneeId: row.assigneeId,
          associateId: row.associateId,
          dueDate: toIsoDate(row.dueDate),
          createdById: input.createdBy,
          links: { app: `/app/atividades/${row.id}` },
        },
      },
      tx,
    );

    return { row, eventId: event.id };
  });

  // Auditoria best-effort APÓS commit (fora da tx, default `db`). Falha de
  // INSERT não aborta a mutação já commitada — `logAuditBestEffort` engole o
  // erro internamente (logger.warn apenas).
  await logAuditBestEffort(
    {
      adminId: input.createdBy,
      action: 'activity_created',
      entityType: 'activity',
      entityId: created.id,
      changes: {
        old: {},
        new: {
          title: created.title,
          status: created.status,
          priority: created.priority,
          assigneeId: created.assigneeId,
          associateId: created.associateId,
          dueDate: created.dueDate,
          tags: created.tags ?? [],
        },
      },
    },
    logger,
  );

  // Dispatch inline fire-and-forget APÓS commit (fora da tx). Detached da
  // request: NÃO aguarda a entrega HTTP (10s/subscription) — a mutação já
  // commitou e a UI retorna imediatamente. Falha swallowed + log estruturado;
  // se o delivery for morto pelo freeze do serverless ou falhar, o evento
  // permanece `pending` no outbox e o cron diário (e o retry exponencial)
  // recupera. A mutação do Kanban nunca falha nem atrasa por causa do webhook.
  void dispatchDomainEventById(eventId).catch((err) => {
    logger.error('inline dispatch failed (activity.created)', { eventId, err });
  });

  return created;
}

export async function updateActivityService(input: UpdateActivityInput) {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new ValidationError('Atividade inválida.');
  }
  if (!Number.isInteger(input.actorId) || input.actorId <= 0) {
    throw new ValidationError('Usuário responsável pela alteração inválido.');
  }
  if (input.status !== undefined && !isActivityStatus(input.status)) {
    throw new ValidationError('Status de atividade inválido.');
  }
  if (input.priority !== undefined && !isActivityPriority(input.priority)) {
    throw new ValidationError('Prioridade de atividade inválida.');
  }
  if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
    throw new ValidationError('Data de vencimento inválida.');
  }

  // Leitura fora da transação: precisamos do snapshot anterior para diff de
  // eventos e para o optimistic lock. Não precisa ser atômica com o update.
  const current = await findActivityById(input.id);
  if (!current) {
    throw new NotFoundError('Atividade');
  }

  const nextStatus = input.status ?? current.status;
  const nextPriority = input.priority ?? current.priority;
  const nextDueDate = input.dueDate === undefined ? current.dueDate : input.dueDate;
  const nextAssigneeId = input.assigneeId === undefined ? current.assigneeId : input.assigneeId;
  const currentCompletedAtIso = current.completedAt?.toISOString().slice(0, 10) ?? null;
  const nextCompletedAtStr = deriveCompletedAt(nextStatus, current.status, currentCompletedAtIso);
  const nextCompletedAt = nextCompletedAtStr ? new Date(nextCompletedAtStr) : null;

  // Update + eventos outbox commitam juntos (atomicidade all-or-nothing). O
  // optimistic lock (CONCURRENCY_CONFLICT) é verificado DENTRO da tx ANTES de
  // qualquer emit, garantindo que nenhum evento fantasma seja inserido se o
  // update falhar. A auditoria é perna best-effort FORA da tx (default `db`),
  // rodada após commit — mesmo padrão do create e do precedent majoritário
  // (`oficios/service.ts`): falha de INSERT de auditoria não deixa a tx
  // Postgres em estado `aborted` nem rollbacka a mutação.
  const { updated, eventIds } = await db.transaction(async (tx) => {
    const row = await updateActivityById(
      input.id,
      {
        status: nextStatus,
        priority: nextPriority,
        dueDate: nextDueDate,
        assigneeId: nextAssigneeId,
        completedAt: nextCompletedAt,
      },
      current.revision,
      tx,
    );

    if (!row) {
      // Lança ANTES de emitir qualquer evento outbox — nenhum registro
      // fantasma em `domain_events`. A tx rollbacka o update (que já falhou
      // no WHERE de optimistic lock, então não houve mutação).
      throw new ConcurrencyConflictError();
    }

    // Helper canônico para os eventos granulares do outbox (um por campo
    // alterado). A guarda de auto-atribuição vive no helper, não aqui.
    const ids = await emitActivityDomainEvents({
      tx,
      actorId: input.actorId,
      current,
      updated: row,
    });

    return { updated: row, eventIds: ids };
  });

  // Auditoria best-effort APÓS commit (fora da tx, default `db`). Falha de
  // INSERT não aborta a mutação já commitada — `logAuditBestEffort` engole o
  // erro internamente (logger.warn apenas).
  await logAuditBestEffort(
    {
      adminId: input.actorId,
      action: 'activity_updated',
      entityType: 'activity',
      entityId: input.id,
      changes: {
        old: {
          status: current.status,
          priority: current.priority,
          dueDate: current.dueDate,
          assigneeId: current.assigneeId,
          completedAt: current.completedAt?.toISOString() ?? null,
        },
        new: {
          status: updated.status,
          priority: updated.priority,
          dueDate: updated.dueDate,
          assigneeId: updated.assigneeId,
          completedAt: updated.completedAt?.toISOString() ?? null,
        },
      },
      metadata: input.reassignmentMessage?.trim()
        ? { reassignmentMessage: input.reassignmentMessage.trim() }
        : undefined,
    },
    logger,
  );

  // Notificações in-app (sino) — best-effort, FORA da tx. Falha não rollbacka
  // a mutação nem derruba a requisição. A guarda de auto-atribuição interna de
  // `emitActivityAssigned` é canônica para o sino (espelha o helper do outbox).
  if (current.status !== 'concluido' && updated.status === 'concluido') {
    try {
      await emitActivityCompleted({
        activityId: updated.id,
        title: updated.title,
        createdBy: input.actorId,
        assigneeId: updated.assigneeId,
        associateId: updated.associateId,
        completedAt: updated.completedAt?.toISOString() ?? new Date().toISOString(),
      });
    } catch (err) {
      logger.error('in-app emit failed (activity.completed)', {
        activityId: updated.id,
        err,
      });
    }
  }

  const assigneeChanged =
    input.assigneeId !== undefined &&
    input.assigneeId !== null &&
    input.assigneeId !== current.assigneeId;

  if (assigneeChanged) {
    try {
      await emitActivityAssigned({
        activityId: updated.id,
        title: updated.title,
        actorId: input.actorId,
        newAssigneeId: input.assigneeId!,
        previousAssigneeId: current.assigneeId,
      });
    } catch (err) {
      logger.error('in-app emit failed (activity.assigned)', {
        activityId: updated.id,
        err,
      });
    }
  }

  // Dispatch inline fire-and-forget APÓS commit, um por evento outbox. Detached
  // da request: NÃO aguarda entregas HTTP sequenciais (até N×10s) — a mutação
  // já commitou e a UI retorna imediatamente. Falha swallowed + log; se o
  // delivery for morto pelo freeze do serverless ou falhar, o evento permanece
  // `pending` e o cron diário (`/api/v1/events/dispatch`) e o retry exponencial
  // recuperam.
  for (const eventId of eventIds) {
    void dispatchDomainEventById(eventId).catch((err) => {
      logger.error('inline dispatch failed (activity.update)', { eventId, err });
    });
  }

  return updated;
}
