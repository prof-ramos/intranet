import {
  emitDomainEvent,
  type DomainEventType,
  type DomainEventPayloadMap,
} from '@/lib/integrations/outbox';
import type { DbExecutor } from '@/lib/db';
import type { Activity } from '@/lib/db/schema';

/**
 * Converte um valor de data (Date do Drizzle, string ISO ou null) em string ISO
 * normalizada para comparação e para o payload do outbox (z.string().datetime()).
 * Retorna null para valores ausentes. Strings inválidas viram null.
 */
export function toIsoDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export interface EmitActivityDomainEventsInput {
  /** Transação ativa do service. O evento só existe se a mutação commitar. */
  tx: DbExecutor;
  /** Admin responsável pela mutação. null = ação de sistema. */
  actorId: number | null;
  /** Estado anterior à mutação (lido fora da tx, antes do `updateActivityById`). */
  current: Activity;
  /** Estado posterior retornado por `updateActivityById`. */
  updated: Activity;
}

/**
 * Emite eventos de domínio granulares de atividade no outbox transacional.
 *
 * Um evento por campo alterado (sem collapse em `activity.updated`):
 * - `activity.status_changed` para qualquer transição de status.
 * - `activity.completed` quando transiciona para `concluido` (em paralelo com `status_changed`).
 * - `activity.assigned` quando o responsável muda E não é auto-atribuição.
 * - `activity.priority_changed` quando a prioridade muda.
 * - `activity.due_date_changed` quando o vencimento muda (inclui null <-> datetime).
 *
 * **Guarda de auto-atribuição canônica** (fonte única de verdade para o outbox):
 * `activity.assigned` não é emitido quando `updated.assigneeId === actorId`.
 *
 * **Ação de sistema (`actorId === null`)**: `events.ts` permite `actorId: number | null`.
 * A comparação `updated.assigneeId !== actorId` é `number !== null` → sempre `true`
 * quando o novo responsável é uma pessoa real, então a atribuição é emitida. Quando o
 * novo responsável é `null` (desatribuição) e `actorId === null`, `null !== null` é
 * `false` → não emite (desatribuição por sistema é silenciosa).
 *
 * Deve ser chamado DENTRO da `db.transaction` do service, APÓS `updateActivityById`
 * confirmar `updated !== null`. Assim, em `CONCURRENCY_CONFLICT` (update retorna null),
 * o service lança antes de chamar este helper → nenhum evento fantasma é inserido.
 *
 * Payloads carregam apenas IDs + `links.app` (sem `title`/`description` — minimização
 * de PII no outbox, que retém eventos por 90 dias).
 */
export async function emitActivityDomainEvents({
  tx,
  actorId,
  current,
  updated,
}: EmitActivityDomainEventsInput): Promise<number[]> {
  const entityId = updated.id;
  const links = { app: `/app/atividades/${updated.id}` };
  const createdById = updated.createdBy;
  const eventIds: number[] = [];

  // Tipado por tipo de evento: cada chamada `emit('activity.status_changed', {...})`
  // checa o payload contra `DomainEventPayloadMap['activity.status_changed']` em
  // compile time, espelhando o schema `.strict()` do outbox. Evita drift entre
  // payload emitido e schema Zod (ponto 8 das review notes do ADR 018).
  const emit = async <T extends DomainEventType>(
    type: T,
    payload: DomainEventPayloadMap[T],
  ) => {
    const event = await emitDomainEvent(
      { type, entityType: 'activity', entityId, actorAdminId: actorId, payload },
      tx,
    );
    eventIds.push(event.id);
  };

  if (current.status !== updated.status) {
    await emit('activity.status_changed', {
      activityId: entityId,
      previousStatus: current.status,
      status: updated.status,
      createdById,
      links,
    });
  }

  if (current.status !== 'concluido' && updated.status === 'concluido') {
    await emit('activity.completed', {
      activityId: entityId,
      completedAt: updated.completedAt?.toISOString() ?? new Date().toISOString(),
      createdById,
      links,
    });
  }

  if (current.assigneeId !== updated.assigneeId && updated.assigneeId !== actorId) {
    await emit('activity.assigned', {
      activityId: entityId,
      previousAssigneeId: current.assigneeId,
      assigneeId: updated.assigneeId,
      createdById,
      links,
    });
  }

  if (current.priority !== updated.priority) {
    await emit('activity.priority_changed', {
      activityId: entityId,
      previousPriority: current.priority,
      priority: updated.priority,
      createdById,
      links,
    });
  }

  const previousDueIso = toIsoDate(current.dueDate);
  const newDueIso = toIsoDate(updated.dueDate);
  if (previousDueIso !== newDueIso) {
    await emit('activity.due_date_changed', {
      activityId: entityId,
      previousDueDate: previousDueIso,
      dueDate: newDueIso,
      createdById,
      links,
    });
  }

  return eventIds;
}