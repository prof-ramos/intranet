import * as repository from './repository';
import { markOverduePaymentsForAudit } from './repository';
import { logAuditAction } from '@/lib/audit/service';
import { db } from '@/lib/db';
import { emitDomainEvent, emitDomainEventsBatch } from '@/lib/integrations/outbox';
import { dispatchDomainEventById } from '@/lib/integrations/webhooks/service';
import {
  paymentStatus,
  type MonthlyPayment,
  type NewMonthlyPayment,
} from '@/lib/db/schema/finance';
import { paymentOrigin } from '@/lib/db/schema/enums';
import { auditLogs } from '@/lib/db/schema/audit';
import { createLogger } from '@/lib/logger';
import { yearMonthObjectSchema } from '@/lib/validation/schemas';
import { ConcurrencyConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { BUSINESS_TIME_ZONE, businessDateOnly } from '@/lib/utils/date';
import { redactPiiString } from '@/lib/sanitize-pii';

const logger = createLogger('finance:service');

export type PaymentOrigin = (typeof paymentOrigin.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];

const DECIMAL_AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SIAPE_TEXT_PATTERN = /\bSIAPE\s*[:#-]?\s*\d{5,12}\b/gi;
const CREDENTIAL_TEXT_PATTERN = /\b(?:token|senha|password|secret)\s*[:=]?\s*\S+/gi;

function sanitizeFinancialAuditText(value: string | null | undefined): string | null {
  if (value == null) return null;
  return redactPiiString(value)
    .replace(SIAPE_TEXT_PATTERN, '[siape]')
    .replace(CREDENTIAL_TEXT_PATTERN, '[token]');
}

/**
 * Canonicalizes an amount without going through a JS number (which could lose
 * cents) and rejects values outside numeric(12,2).
 */
export function validatePaymentAmount(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  const normalized = typeof value === 'number' ? String(value) : value.trim().replace(',', '.');
  if (!DECIMAL_AMOUNT_PATTERN.test(normalized)) {
    throw new ValidationError('Valor deve ser um número BRL com até 2 casas decimais.');
  }
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const amountInCents =
    BigInt(integerPart) * BigInt(100) + BigInt(decimalPart.padEnd(2, '0') || '0');
  if (amountInCents <= BigInt(0)) {
    throw new ValidationError('Valor deve ser maior que zero.');
  }
  return `${integerPart}.${decimalPart.padEnd(2, '0')}`;
}

export function validatePaymentNotes(value: string | null | undefined): string | null {
  if (value == null) return null;
  const notes = value.trim();
  if (notes.length > 2000) {
    throw new ValidationError('Observações devem ter no máximo 2.000 caracteres.');
  }
  return notes || null;
}

function parseCivilDate(value: string): { year: number; month: number; day: number } {
  if (!CIVIL_DATE_PATTERN.test(value)) {
    throw new ValidationError('Data de pagamento deve estar no formato AAAA-MM-DD.');
  }
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new ValidationError('Data de pagamento inválida.');
  }
  return { year, month, day };
}

/**
 * Converts an operator-entered civil date to midnight in America/Sao_Paulo.
 * The date is stored as timestamptz, but callers never need to provide an
 * hour or an offset. The offset is derived from Intl so this remains correct
 * if the business timezone rules change again.
 */
export function civilDateToBusinessInstant(value: string): Date {
  const { year, month, day } = parseCivilDate(value);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const probe = new Date(utcMidnight);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(probe);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  const localAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
  );
  const offsetMinutes = Math.round((localAsUtc - utcMidnight) / 60_000);
  return new Date(utcMidnight - offsetMinutes * 60_000);
}

export function validatePaymentDate(
  value: string | null | undefined,
  now = new Date(),
): Date | null {
  if (value == null || value === '') return null;
  const parsed = civilDateToBusinessInstant(value);
  if (parsed.getTime() > now.getTime()) {
    throw new ValidationError('Data de pagamento não pode ser futura.');
  }
  return parsed;
}

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
    throw new ValidationError(
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
    //
    // Batch insert: um único `INSERT ... VALUES (...), (...)` em vez de N+1
    // INSERTs sequenciais dentro da tx. Preserva o invariant do outbox
    // (commit/rollback atômico) e valida/sanitiza cada payload igual ao
    // `emitDomainEvent` unitário.
    const emittedEvents = await emitDomainEventsBatch(
      rows.map((payment) => ({
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
      })),
      tx,
    );
    const emittedEventIds = emittedEvents.map((event) => event.id);

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

function getPaymentAuditState(payment: MonthlyPayment, includeStructured = true) {
  const state = {
    status: payment.status,
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt ?? null,
    cancelledAt: payment.cancelledAt ?? null,
    cancellationReason: sanitizeFinancialAuditText(payment.cancellationReason),
    cancelledBy: payment.cancelledBy ?? null,
  };
  if (!includeStructured) return state;
  return {
    ...state,
    amount: payment.amount ?? null,
    origin: payment.origin ?? 'outros',
    notes: sanitizeFinancialAuditText(payment.notes),
  };
}

function validateCancellationReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new ValidationError('Motivo de cancelamento obrigatório.');
  }
  if (trimmed.length > 500) {
    throw new ValidationError('Motivo de cancelamento deve ter no máximo 500 caracteres.');
  }
  return trimmed;
}

export function validateYearMonth(year: number, month: number): void {
  const parsed = yearMonthObjectSchema.safeParse({ year, month });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }
}

export type MonthlyPaymentUpdateInput = Pick<
  MonthlyPayment,
  'associateId' | 'year' | 'month' | 'status' | 'paymentMethod'
> & {
  /** Decimal BRL string. Optional preserves legacy status-only updates. */
  amount?: string | number | null;
  origin?: PaymentOrigin;
  notes?: string | null;
  /** Operator-facing civil date (YYYY-MM-DD), not an arbitrary timestamp. */
  paidAt?: string | null;
};

function valuesDiffer(left: unknown, right: unknown): boolean {
  if (left instanceof Date || right instanceof Date) {
    const leftTime = left instanceof Date ? left.getTime() : null;
    const rightTime = right instanceof Date ? right.getTime() : null;
    return leftTime !== rightTime;
  }
  return left !== right;
}

function paymentStateChanged(
  oldState: ReturnType<typeof getPaymentAuditState>,
  nextState: ReturnType<typeof getPaymentAuditState>,
): boolean {
  const old = oldState as ReturnType<typeof getPaymentAuditState> & {
    amount?: unknown;
    origin?: unknown;
    notes?: unknown;
  };
  const next = nextState as typeof old;
  return (
    valuesDiffer(old.status, next.status) ||
    valuesDiffer(old.paymentMethod, next.paymentMethod) ||
    valuesDiffer(old.amount, next.amount) ||
    valuesDiffer(old.origin, next.origin) ||
    valuesDiffer(old.notes, next.notes) ||
    valuesDiffer(old.paidAt, next.paidAt) ||
    valuesDiffer(old.cancelledAt, next.cancelledAt) ||
    valuesDiffer(old.cancellationReason, next.cancellationReason) ||
    valuesDiffer(old.cancelledBy, next.cancelledBy)
  );
}

export async function updateMonthlyPayment(
  adminId: number,
  payment: MonthlyPaymentUpdateInput,
  expectedUpdatedAt?: string | null,
) {
  return db.transaction(async (tx) => {
    const current = await repository.findMonthlyPayment(
      payment.associateId,
      payment.year,
      payment.month,
      tx,
    );

    if (current && current.status !== payment.status) {
      validateStatusTransition(current.status, payment.status);
    }

    if (current && expectedUpdatedAt != null) {
      const currentUpdatedAt = current.updatedAt?.toISOString() ?? null;
      if (currentUpdatedAt !== expectedUpdatedAt) {
        throw new ConcurrencyConflictError();
      }
    }

    const oldState = current ? getPaymentAuditState(current) : null;

    const amountWasProvided = Object.hasOwn(payment, 'amount');
    const structuredInputWasProvided =
      amountWasProvided ||
      Object.hasOwn(payment, 'origin') ||
      Object.hasOwn(payment, 'notes') ||
      Object.hasOwn(payment, 'paidAt');
    const amount = amountWasProvided
      ? validatePaymentAmount(payment.amount)
      : (current?.amount ?? null);
    const legacyRowWithoutStructuredAmount = current != null && !Object.hasOwn(current, 'amount');
    if (
      payment.status === 'pago' &&
      amount === null &&
      (!current || structuredInputWasProvided || !legacyRowWithoutStructuredAmount)
    ) {
      throw new ValidationError('Informe um valor maior que zero para um pagamento pago.');
    }
    const origin = payment.origin ?? current?.origin ?? 'outros';
    const notes = Object.hasOwn(payment, 'notes')
      ? validatePaymentNotes(payment.notes)
      : (current?.notes ?? null);

    // Derive paidAt server-side for audit integrity:
    // - Transitioning TO 'pago': set to now()
    // - Already 'pago' staying 'pago': preserve existing paidAt
    // - Transitioning away from 'pago': clear
    const paidAt =
      payment.status === 'pago'
        ? payment.paidAt
          ? validatePaymentDate(payment.paidAt)
          : current?.status === 'pago' && current.paidAt
            ? current.paidAt
            : civilDateToBusinessInstant(businessDateOnly())
        : null;

    if (payment.status === 'pago' && !paidAt) {
      throw new ValidationError('Informe a data de pagamento.');
    }

    const updatedPayment = await repository.upsertMonthlyPayment(
      {
        ...payment,
        amount,
        origin,
        notes,
        paidAt,
        updatedBy: adminId,
      },
      expectedUpdatedAt,
      tx,
    );

    if (!updatedPayment) {
      // setWhere predicate failed — another writer changed the row concurrently.
      throw new ConcurrencyConflictError();
    }

    const newState = getPaymentAuditState({
      ...updatedPayment,
      ...payment,
      amount,
      origin,
      notes,
      paidAt,
      cancelledAt: null,
      cancellationReason: null,
      cancelledBy: null,
    } as MonthlyPayment);
    await logAuditAction({
      adminId,
      action: current ? 'update' : 'create',
      entityType: 'monthly_payment' as const,
      entityId: updatedPayment.id,
      changes: {
        old: oldState,
        new: newState,
      },
      metadata: {
        associateId: payment.associateId,
        year: payment.year,
        month: payment.month,
      },
      executor: tx,
    });

    if (oldState && paymentStateChanged(oldState, newState)) {
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
}

export async function cancelMonthlyPayment(
  adminId: number,
  paymentId: number,
  reason: string,
  expectedUpdatedAt?: string | null,
) {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    throw new ValidationError('Mensalidade inválida.');
  }

  const cancellationReason = validateCancellationReason(reason);

  return db.transaction(async (tx) => {
    const current = await repository.findMonthlyPaymentById(paymentId, tx);
    if (!current) {
      throw new NotFoundError('Pagamento');
    }
    if (current.status === 'cancelado') {
      throw new ValidationError('Pagamento já cancelado.');
    }

    const cancelledAt = new Date();
    const hasStructuredFields =
      Object.hasOwn(current, 'amount') ||
      Object.hasOwn(current, 'origin') ||
      Object.hasOwn(current, 'notes');
    const oldState = getPaymentAuditState(current, hasStructuredFields);
    const updatedPayment = await repository.cancelMonthlyPaymentRow(
      paymentId,
      adminId,
      cancellationReason,
      cancelledAt,
      tx,
      expectedUpdatedAt,
    );

    if (!updatedPayment) {
      // F-007: another writer changed the row concurrently between the read above and this update.
      throw new ConcurrencyConflictError(
        'Pagamento foi alterado por outra pessoa. Recarregue a página.',
      );
    }

    const newState = getPaymentAuditState(updatedPayment, hasStructuredFields);

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

    await logAuditAction({
      adminId,
      action: 'cancel',
      entityType: 'monthly_payment',
      entityId: updatedPayment.id,
      changes: {
        old: oldState,
        new: newState,
      },
      metadata: {
        associateId: updatedPayment.associateId,
        year: updatedPayment.year,
        month: updatedPayment.month,
        cancellationReason: sanitizeFinancialAuditText(cancellationReason),
      },
      executor: tx,
    });

    return updatedPayment;
  });
}

export async function initializeMonth(adminId: number, year: number, month: number) {
  validateYearMonth(year, month);

  const counts = await db.transaction(async (tx) => {
    // Read and write in the same transaction to prevent TOCTOU races
    const missing = await repository.findAssociatesMissingPaymentForMonth(year, month, tx);

    const updates: NewMonthlyPayment[] = missing.map((r) => ({
      associateId: r.associateId,
      year,
      month,
      status: r.defaultPaymentMethod === 'folha' ? 'pago' : 'pendente',
      paymentMethod: r.defaultPaymentMethod,
      updatedBy: adminId,
    }));

    const inserted =
      updates.length > 0 ? await repository.insertMonthlyPaymentsIfMissing(updates, tx) : [];

    const counts = {
      created: inserted.length,
      maintained: Math.max(0, missing.length - inserted.length),
      rejected: 0,
    };

    await logAuditAction({
      adminId,
      action: 'initialize_month',
      entityType: 'finance',
      entityId: null,
      changes: {
        old: null,
        new: { year, month, ...counts },
      },
      metadata: { year, month },
      executor: tx,
    });

    return counts;
  });

  return counts;
}
