import * as repository from './repository';
import { markOverduePaymentsForAudit } from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { db } from '@/lib/db';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { dispatchDomainEventById } from '@/lib/integrations/webhooks/service';
import {
  monthlyPayments,
  type MonthlyPayment,
  type NewMonthlyPayment,
} from '@/lib/db/schema/finance';
import { auditLogs } from '@/lib/db/schema/audit';
import { associates } from '@/lib/db/schema/associates';
import { and, eq, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { yearMonthObjectSchema } from '@/lib/validation/schemas';

const logger = createLogger('finance:service');

/**
 * Valid status transitions for monthly payments.
 * `cancelado` is terminal — no transitions out.
 * New records (no `current`) skip transition validation.
 */
// Cancellation is a separate domain flow handled by cancelMonthlyPayment,
// which sets cancelledAt, cancelledBy, and cancellationReason. The update
// path explicitly clears those fields, so reaching 'cancelado' through it
// would produce an inconsistent record. Remove 'cancelado' from targets.
const VALID_TRANSITIONS: Record<string, Set<string>> = {
  pendente: new Set(['pago', 'atrasado', 'isento']),
  atrasado: new Set(['pago', 'pendente', 'isento']),
  pago: new Set(['pendente']),
  isento: new Set(['pendente']),
  cancelado: new Set(),
};

export function validateStatusTransition(currentStatus: string, newStatus: string): void {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.has(newStatus)) {
    throw new Error(
      `Transição inválida: não é possível alterar de '${currentStatus}' para '${newStatus}'.`,
    );
  }
}

export async function autoMarkOverduePaymentsService(): Promise<number> {
  const { transitioned, eventIds } = await db.transaction(async (tx) => {
    const rows = await markOverduePaymentsForAudit(tx);

    if (rows.length > 0) {
      await tx.insert(auditLogs).values(
        rows.map((payment) => ({
          performedBy: null,
          action: 'auto_mark_overdue',
          entityType: 'monthly_payment' as const,
          entityId: payment.id,
          changes: {
            old: { status: 'pendente' },
            new: { status: 'atrasado' },
          },
          metadata: {
            actorType: 'system',
            associateId: payment.associateId,
            year: payment.year,
            month: payment.month,
          },
        })),
      );
    }

    // Outbox invariant: emit domain events INSIDE the tx so the event row
    // commits (or rolls back) with the mutation. Post-commit dispatch below
    // is fire-and-forget; the cron /api/v1/events/dispatch is the safety net.
    const emittedEventIds: number[] = [];
    for (const payment of rows) {
      const inserted = await emitDomainEvent(
        {
          type: 'monthly_payment.updated' as const,
          entityType: 'monthly_payment' as const,
          entityId: payment.id,
          actorAdminId: null,
          payload: {
            associateId: payment.associateId,
            year: payment.year,
            month: payment.month,
            previousStatus: 'pendente' as const,
            status: 'atrasado' as const,
            paymentMethod: payment.paymentMethod,
            paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
            links: {
              app: `/app/financeiro/mensalidades?year=${payment.year}&month=${payment.month}`,
            },
          },
        },
        tx,
      );
      emittedEventIds.push(inserted.id);
    }

    return { transitioned: rows, eventIds: emittedEventIds };
  });

  // Fire-and-forget post-commit dispatch so webhooks send promptly without
  // waiting for the cron. The cron /api/v1/events/dispatch remains the safety
  // net for any dispatch that fails or is skipped here.
  for (const id of eventIds) {
    void dispatchDomainEventById(id).catch((e) => {
      logger.error('[autoMarkOverdue] post-commit dispatch failed', {
        eventId: id,
        error: String(e),
      });
    });
  }

  const count = transitioned.length;

  if (count > 0) {
    logger.info('[autoMarkOverdue] Transitioned payments pendente → atrasado', { count });
  }

  return count;
}

function getPaymentAuditState(payment: MonthlyPayment) {
  return {
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt,
    cancelledAt: payment.cancelledAt,
    cancellationReason: payment.cancellationReason,
    cancelledBy: payment.cancelledBy,
  };
}

function validateCancellationReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new Error('Motivo de cancelamento obrigatório.');
  }
  if (trimmed.length > 500) {
    throw new Error('Motivo de cancelamento deve ter no máximo 500 caracteres.');
  }
  return trimmed;
}

export function validateYearMonth(year: number, month: number): void {
  const parsed = yearMonthObjectSchema.safeParse({ year, month });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
}

export type MonthlyPaymentUpdateInput = Pick<
  MonthlyPayment,
  'associateId' | 'year' | 'month' | 'status' | 'paymentMethod'
>;

export async function updateMonthlyPayment(
  adminId: number,
  payment: MonthlyPaymentUpdateInput,
  expectedUpdatedAt?: string | null,
) {
  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(monthlyPayments)
      .where(
        and(
          eq(monthlyPayments.associateId, payment.associateId),
          eq(monthlyPayments.year, payment.year),
          eq(monthlyPayments.month, payment.month),
        ),
      )
      .limit(1);

    const current = existing[0] ?? null;

    if (current && current.status !== payment.status) {
      validateStatusTransition(current.status, payment.status);
    }

    if (current && expectedUpdatedAt != null) {
      const currentUpdatedAt = current.updatedAt?.toISOString() ?? null;
      if (currentUpdatedAt !== expectedUpdatedAt) {
        throw new Error('CONCURRENCY_CONFLICT');
      }
    }

    const oldState = current ? getPaymentAuditState(current) : null;

    // Derive paidAt server-side for audit integrity:
    // - Transitioning TO 'pago': set to now()
    // - Already 'pago' staying 'pago': preserve existing paidAt
    // - Transitioning away from 'pago': clear
    const paidAt =
      payment.status === 'pago' ? (current?.status === 'pago' ? current.paidAt : new Date()) : null;

    const upserted = await tx
      .insert(monthlyPayments)
      .values({
        ...payment,
        paidAt,
        updatedBy: adminId,
      })
      .onConflictDoUpdate({
        target: [monthlyPayments.associateId, monthlyPayments.year, monthlyPayments.month],
        set: {
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          paidAt,
          cancelledAt: null,
          cancellationReason: null,
          cancelledBy: null,
          updatedBy: adminId,
          updatedAt: sql`now()`,
        },
        // F-007: Include updated_at in the conflict predicate so concurrent writes
        // with a stale expectedUpdatedAt do not silently overwrite newer state.
        setWhere:
          expectedUpdatedAt != null
            ? sql`${monthlyPayments.updatedAt} = ${new Date(expectedUpdatedAt)}`
            : undefined,
      })
      .returning();
    const updatedPayment = upserted[0];

    if (!updatedPayment) {
      // setWhere predicate failed — another writer changed the row concurrently.
      throw new Error('CONCURRENCY_CONFLICT');
    }

    await logAuditAction({
      adminId,
      action: 'update',
      entityType: 'monthly_payment',
      entityId: updatedPayment.id,
      changes: {
        old: oldState ?? {},
        new: {
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          paidAt,
          cancelledAt: null,
          cancellationReason: null,
          cancelledBy: null,
        },
      },
      metadata: {
        associateId: payment.associateId,
        year: payment.year,
        month: payment.month,
      },
    });

    if (oldState && oldState.status !== payment.status) {
      await emitDomainEvent(
        {
          type: 'monthly_payment.updated',
          entityType: 'monthly_payment',
          entityId: updatedPayment.id,
          actorAdminId: adminId,
          payload: {
            associateId: payment.associateId,
            year: payment.year,
            month: payment.month,
            previousStatus: oldState.status,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            paidAt: paidAt ? paidAt.toISOString() : null,
            links: {
              app: `/app/financeiro/mensalidades?year=${payment.year}&month=${payment.month}`,
            },
          },
        },
        tx,
      );
    }

    return updatedPayment;
  });

  return result;
}

export async function cancelMonthlyPayment(adminId: number, paymentId: number, reason: string) {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    throw new Error('Mensalidade inválida.');
  }

  const cancellationReason = validateCancellationReason(reason);

  const { result, auditArgs } = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, paymentId))
      .limit(1);

    const current = rows[0] ?? null;
    if (!current) {
      throw new Error('PAYMENT_NOT_FOUND');
    }
    if (current.status === 'cancelado') {
      throw new Error('PAYMENT_ALREADY_CANCELLED');
    }

    const cancelledAt = new Date();
    const oldState = getPaymentAuditState(current);
    const [updatedPayment] = await tx
      .update(monthlyPayments)
      .set({
        status: 'cancelado',
        paidAt: null,
        cancelledAt,
        cancellationReason,
        cancelledBy: adminId,
        updatedBy: adminId,
        updatedAt: sql`now()`,
      })
      // F-007: Atomic conditional update — only succeed if the row is still non-cancelled.
      // Prevents a double-cancel race where two concurrent requests both read status != 'cancelado'.
      .where(and(eq(monthlyPayments.id, paymentId), sql`${monthlyPayments.status} != 'cancelado'`))
      .returning();

    if (!updatedPayment) {
      throw new Error('PAYMENT_ALREADY_CANCELLED');
    }

    const newState = getPaymentAuditState(updatedPayment);

    // Outbox invariant: emitDomainEvent MUST stay inside the tx.
    await emitDomainEvent(
      {
        type: 'monthly_payment.updated',
        entityType: 'monthly_payment',
        entityId: updatedPayment.id,
        actorAdminId: adminId,
        payload: {
          associateId: updatedPayment.associateId,
          year: updatedPayment.year,
          month: updatedPayment.month,
          previousStatus: oldState.status,
          status: 'cancelado',
          paymentMethod: updatedPayment.paymentMethod,
          paidAt: null,
          cancelledAt: cancelledAt.toISOString(),
          cancellationReason,
          links: {
            app: `/app/financeiro/mensalidades?year=${updatedPayment.year}&month=${updatedPayment.month}`,
          },
        },
      },
      tx,
    );

    return {
      result: updatedPayment,
      auditArgs: {
        adminId,
        action: 'cancel',
        entityType: 'monthly_payment' as const,
        entityId: updatedPayment.id,
        changes: {
          old: oldState,
          new: newState,
        },
        metadata: {
          associateId: updatedPayment.associateId,
          year: updatedPayment.year,
          month: updatedPayment.month,
          cancellationReason,
        },
      },
    };
  });

  // Best-effort audit AFTER the tx commits. A failed audit INSERT must not abort the
  // mutation's tx (the audit executor poisons PG tx on failure). Default `db` isolates the audit.
  try {
    await logAuditAction(auditArgs);
  } catch {
    logger.error('Audit log failed (non-critical)', { paymentId });
  }

  return result;
}

export async function initializeMonth(adminId: number, year: number, month: number) {
  validateYearMonth(year, month);

  const count = await db.transaction(async (tx) => {
    // Read and write in the same transaction to prevent TOCTOU races
    const rows = await tx
      .select({
        associateId: associates.id,
        defaultPaymentMethod: associates.paymentMethod,
        paymentId: monthlyPayments.id,
      })
      .from(associates)
      .leftJoin(
        monthlyPayments,
        and(
          eq(associates.id, monthlyPayments.associateId),
          eq(monthlyPayments.year, year),
          eq(monthlyPayments.month, month),
        ),
      )
      .where(eq(associates.associationStatus, 'associado'));

    const updates: NewMonthlyPayment[] = rows
      .filter((r) => !r.paymentId)
      .map((r) => ({
        associateId: r.associateId,
        year,
        month,
        status: r.defaultPaymentMethod === 'folha' ? 'pago' : 'pendente',
        paymentMethod: r.defaultPaymentMethod,
        updatedBy: adminId,
      }));

    const inserted =
      updates.length > 0 ? await repository.insertMonthlyPaymentsIfMissing(updates, tx) : [];

    await logAuditAction({
      adminId,
      action: 'initialize_month',
      entityType: 'finance',
      entityId: null,
      metadata: { year, month, count: inserted.length },
    });

    return inserted.length;
  });

  return count;
}
