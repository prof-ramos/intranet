import { isDomesticCountrySql, isExteriorCountrySql } from '@/lib/associates/location-country';
import { db, type DbExecutor } from '@/lib/db';
import {
  monthlyPayments,
  paymentStatus,
  type MonthlyPayment,
  type NewMonthlyPayment,
} from '@/lib/db/schema/finance';
import { paymentOrigin } from '@/lib/db/schema/enums';
import { associates } from '@/lib/db/schema/associates';
import { and, asc, desc, eq, ilike, isNull, lt, or, sql } from 'drizzle-orm';
import { escapeLikePattern } from '@/lib/db/like-pattern';
import { effectivePaymentMethodSql } from './effective-payment';
import { getBusinessDateParts } from '@/lib/utils/date';
import { normalizePagination } from '@/lib/pagination';

export interface PaymentHistoryItem {
  year: number;
  month: number;
  status: string;
  paymentMethod: string | null;
  origin: (typeof paymentOrigin.enumValues)[number];
  amount: string | null;
  notes: string | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  cancelledBy: number | null;
  updatedAt: Date;
}

export async function getPaymentHistoryForAssociate(
  associateId: number,
): Promise<PaymentHistoryItem[]> {
  const rows = await db
    .select({
      year: monthlyPayments.year,
      month: monthlyPayments.month,
      status: monthlyPayments.status,
      paymentMethod: monthlyPayments.paymentMethod,
      origin: monthlyPayments.origin,
      amount: monthlyPayments.amount,
      notes: monthlyPayments.notes,
      paidAt: monthlyPayments.paidAt,
      cancelledAt: monthlyPayments.cancelledAt,
      cancellationReason: monthlyPayments.cancellationReason,
      cancelledBy: monthlyPayments.cancelledBy,
      updatedAt: monthlyPayments.updatedAt,
    })
    .from(monthlyPayments)
    .where(eq(monthlyPayments.associateId, associateId))
    .orderBy(desc(monthlyPayments.year), desc(monthlyPayments.month))
    .limit(24);

  return rows.map((r) => ({
    year: r.year,
    month: r.month,
    status: r.status,
    paymentMethod: r.paymentMethod ?? null,
    origin: r.origin ?? 'outros',
    amount: r.amount ?? null,
    notes: r.notes ?? null,
    paidAt: r.paidAt ?? null,
    cancelledAt: r.cancelledAt ?? null,
    cancellationReason: r.cancellationReason ?? null,
    cancelledBy: r.cancelledBy ?? null,
    updatedAt: r.updatedAt,
  }));
}

export interface MonthlyPaymentsFilters {
  q?: string;
  status?: (typeof paymentStatus.enumValues)[number];
  method?: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
  origin?: (typeof paymentOrigin.enumValues)[number];
  location?: 'brasil' | 'exterior';
  page?: number;
  pageSize?: number;
}

export interface MonthlyPaymentsAggregates {
  total: number;
  pagos: number;
  pendentes: number;
  atrasados: number;
  isentos: number;
  cancelados: number;
  exterior: number;
  folha: number;
  boleto: number;
  pix: number;
  transferencia: number;
  outros: number;
  boletoPix: number;
  paymentRecords: number;
  /** Sum of non-cancelled received amounts, in BRL with two decimal places. */
  valorRecebido: string;
  sigepe: number;
  itamaraty: number;
  comprovante: number;
  originOutros: number;
}

export async function findMonthlyPayment(
  associateId: number,
  year: number,
  month: number,
  executor: DbExecutor = db,
) {
  const rows = await executor
    .select()
    .from(monthlyPayments)
    .where(
      and(
        eq(monthlyPayments.associateId, associateId),
        eq(monthlyPayments.year, year),
        eq(monthlyPayments.month, month),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findMonthlyPaymentById(paymentId: number, executor: DbExecutor = db) {
  const rows = await executor
    .select()
    .from(monthlyPayments)
    .where(eq(monthlyPayments.id, paymentId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Upserts a monthly payment, clearing cancellation fields on every write —
 * cancellation is a separate flow (see `cancelMonthlyPayment`) that this path
 * must not leave in an inconsistent partial state.
 *
 * When `expectedUpdatedAt` is provided, the update only applies if the row's
 * `updated_at` still matches (F-007 optimistic concurrency check). A stale
 * caller gets back `undefined` instead of silently overwriting newer state.
 *
 * The comparison truncates `updated_at` to millisecond precision because the
 * column is `timestamptz` (microsecond precision in Postgres) while
 * `expectedUpdatedAt` round-trips through a JS `Date`/`toISOString()`, which
 * only carries milliseconds — an untruncated comparison would never match
 * and every conditional update would be rejected as a false conflict.
 */
export async function upsertMonthlyPayment(
  payment: NewMonthlyPayment,
  expectedUpdatedAt?: string | null,
  executor: DbExecutor = db,
) {
  const [updated] = await executor
    .insert(monthlyPayments)
    .values(payment)
    .onConflictDoUpdate({
      target: [monthlyPayments.associateId, monthlyPayments.year, monthlyPayments.month],
      set: {
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        origin: payment.origin,
        notes: payment.notes,
        paidAt: payment.paidAt,
        cancelledAt: null,
        cancellationReason: null,
        cancelledBy: null,
        updatedBy: payment.updatedBy,
        updatedAt: sql`now()`,
      },
      setWhere:
        expectedUpdatedAt != null
          ? sql`date_trunc('milliseconds', ${monthlyPayments.updatedAt}) = ${new Date(expectedUpdatedAt).toISOString()}`
          : undefined,
    })
    .returning();
  return updated;
}

/**
 * Atomic conditional cancellation — only succeeds if the row is still
 * non-cancelled, preventing a double-cancel race where two concurrent
 * requests both read status != 'cancelado'.
 */
export async function cancelMonthlyPaymentRow(
  paymentId: number,
  adminId: number,
  cancellationReason: string,
  cancelledAt: Date,
  executor: DbExecutor = db,
  expectedUpdatedAt?: string | null,
) {
  const [updated] = await executor
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
    .where(
      and(
        eq(monthlyPayments.id, paymentId),
        sql`${monthlyPayments.status} != 'cancelado'`,
        expectedUpdatedAt != null
          ? sql`date_trunc('milliseconds', ${monthlyPayments.updatedAt}) = ${new Date(expectedUpdatedAt).toISOString()}`
          : undefined,
      ),
    )
    .returning();
  return updated;
}

export async function insertMonthlyPaymentsIfMissing(
  payments: NewMonthlyPayment[],
  executor: DbExecutor = db,
) {
  if (payments.length === 0) return [];
  return executor.insert(monthlyPayments).values(payments).onConflictDoNothing().returning();
}

export interface AssociateMissingPayment {
  associateId: number;
  defaultPaymentMethod: NewMonthlyPayment['paymentMethod'];
}

export async function findAssociatesMissingPaymentForMonth(
  year: number,
  month: number,
  executor: DbExecutor = db,
): Promise<AssociateMissingPayment[]> {
  const rows = await executor
    .select({
      associateId: associates.id,
      defaultPaymentMethod: associates.paymentMethod,
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
    .where(and(eq(associates.associationStatus, 'associado'), isNull(monthlyPayments.id)));

  return rows.map((r) => ({
    associateId: r.associateId,
    defaultPaymentMethod: r.defaultPaymentMethod,
  }));
}

export interface OverduePaymentTransition {
  id: number;
  associateId: number;
  year: number;
  month: number;
  status: 'atrasado';
  paymentMethod: MonthlyPayment['paymentMethod'];
  paidAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  cancelledBy: number | null;
}

export async function markOverduePaymentsForAudit(
  executor: DbExecutor = db,
  now: Date = new Date(),
): Promise<OverduePaymentTransition[]> {
  const { year: thisYear, month: thisMonth } = getBusinessDateParts(now);

  return executor
    .update(monthlyPayments)
    .set({
      status: 'atrasado',
      updatedBy: null,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(monthlyPayments.status, 'pendente'),
        or(
          lt(monthlyPayments.year, thisYear),
          and(eq(monthlyPayments.year, thisYear), lt(monthlyPayments.month, thisMonth)),
        ),
      ),
    )
    .returning({
      id: monthlyPayments.id,
      associateId: monthlyPayments.associateId,
      year: monthlyPayments.year,
      month: monthlyPayments.month,
      status: monthlyPayments.status,
      paymentMethod: monthlyPayments.paymentMethod,
      paidAt: monthlyPayments.paidAt,
      cancelledAt: monthlyPayments.cancelledAt,
      cancellationReason: monthlyPayments.cancellationReason,
      cancelledBy: monthlyPayments.cancelledBy,
    }) as Promise<OverduePaymentTransition[]>;
}

function buildNamePattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}

export async function getAssociatesWithPayments(
  year: number,
  month: number,
  filters?: MonthlyPaymentsFilters,
) {
  const { page, pageSize } = normalizePagination(filters?.page ?? 1, filters?.pageSize ?? 20);
  const conditions = [eq(associates.associationStatus, 'associado')];

  if (filters?.q && filters.q.trim()) {
    conditions.push(ilike(associates.fullName, buildNamePattern(filters.q.trim())));
  }

  if (filters?.location) {
    if (filters.location === 'brasil') {
      conditions.push(isDomesticCountrySql(associates.locationCountry));
    } else if (filters.location === 'exterior') {
      conditions.push(isExteriorCountrySql(associates.locationCountry));
    }
  }

  if (filters?.status) {
    if (filters.status === 'pendente') {
      conditions.push(
        sql`(${monthlyPayments.status} = 'pendente' OR ${monthlyPayments.id} IS NULL)`,
      );
    } else {
      conditions.push(eq(monthlyPayments.status, filters.status));
    }
  }

  if (filters?.method) {
    conditions.push(
      eq(
        effectivePaymentMethodSql(monthlyPayments.paymentMethod, associates.paymentMethod),
        filters.method,
      ),
    );
  }

  if (filters?.origin) {
    conditions.push(eq(monthlyPayments.origin, filters.origin));
  }

  const joinCondition = and(
    eq(associates.id, monthlyPayments.associateId),
    eq(monthlyPayments.year, year),
    eq(monthlyPayments.month, month),
  );
  const where = and(...conditions);
  const effectiveMethod = effectivePaymentMethodSql(
    monthlyPayments.paymentMethod,
    associates.paymentMethod,
  );

  const rowsQuery = db
    .select({
      associateId: associates.id,
      fullName: associates.fullName,
      defaultPaymentMethod: associates.paymentMethod,
      functionalStatus: associates.functionalStatus,
      locationCountry: associates.locationCountry,
      locationCity: associates.locationCity,
      paymentId: monthlyPayments.id,
      paymentStatus: monthlyPayments.status,
      monthPaymentMethod: monthlyPayments.paymentMethod,
      amount: monthlyPayments.amount,
      origin: monthlyPayments.origin,
      notes: monthlyPayments.notes,
      paidAt: monthlyPayments.paidAt,
      cancelledAt: monthlyPayments.cancelledAt,
      updatedAt: monthlyPayments.updatedAt,
    })
    .from(associates)
    .leftJoin(monthlyPayments, joinCondition)
    .where(where)
    .orderBy(asc(associates.fullName), asc(associates.id))
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const aggregatesQuery = db
    .select({
      total: sql<number>`count(*)`,
      pagos: sql<number>`count(*) filter (where ${monthlyPayments.status} = 'pago')`,
      pendentes: sql<number>`count(*) filter (where ${monthlyPayments.status} = 'pendente' or ${monthlyPayments.id} is null)`,
      atrasados: sql<number>`count(*) filter (where ${monthlyPayments.status} = 'atrasado')`,
      isentos: sql<number>`count(*) filter (where ${monthlyPayments.status} = 'isento')`,
      cancelados: sql<number>`count(*) filter (where ${monthlyPayments.status} = 'cancelado')`,
      exterior: sql<number>`count(*) filter (where ${isExteriorCountrySql(associates.locationCountry)})`,
      folha: sql<number>`count(*) filter (where ${effectiveMethod} = 'folha')`,
      boleto: sql<number>`count(*) filter (where ${effectiveMethod} = 'boleto')`,
      pix: sql<number>`count(*) filter (where ${effectiveMethod} = 'pix')`,
      transferencia: sql<number>`count(*) filter (where ${effectiveMethod} = 'transferencia')`,
      outros: sql<number>`count(*) filter (where ${effectiveMethod} = 'outros')`,
      boletoPix: sql<number>`count(*) filter (where ${effectiveMethod} in ('boleto', 'pix'))`,
      paymentRecords: sql<number>`count(${monthlyPayments.id})`,
      valorRecebido: sql<string>`coalesce(sum(${monthlyPayments.amount}) filter (where ${monthlyPayments.status} = 'pago' and ${monthlyPayments.cancelledAt} is null), 0)::numeric(12, 2)`,
      sigepe: sql<number>`count(*) filter (where ${monthlyPayments.origin} = 'sigepe')`,
      itamaraty: sql<number>`count(*) filter (where ${monthlyPayments.origin} = 'itamaraty')`,
      comprovante: sql<number>`count(*) filter (where ${monthlyPayments.origin} = 'comprovante')`,
      originOutros: sql<number>`count(*) filter (where ${monthlyPayments.origin} = 'outros')`,
    })
    .from(associates)
    .leftJoin(monthlyPayments, joinCondition)
    .where(where);

  const [rows, aggregateRows] = await Promise.all([rowsQuery, aggregatesQuery]);
  const raw = aggregateRows[0];
  const number = (value: number | undefined) => Number(value ?? 0);
  const total = number(raw?.total);
  const aggregates: MonthlyPaymentsAggregates = {
    total,
    pagos: number(raw?.pagos),
    pendentes: number(raw?.pendentes),
    atrasados: number(raw?.atrasados),
    isentos: number(raw?.isentos),
    cancelados: number(raw?.cancelados),
    exterior: number(raw?.exterior),
    folha: number(raw?.folha),
    boleto: number(raw?.boleto),
    pix: number(raw?.pix),
    transferencia: number(raw?.transferencia),
    outros: number(raw?.outros),
    boletoPix: number(raw?.boletoPix),
    paymentRecords: number(raw?.paymentRecords),
    valorRecebido: String(raw?.valorRecebido ?? '0.00'),
    sigepe: number(raw?.sigepe),
    itamaraty: number(raw?.itamaraty),
    comprovante: number(raw?.comprovante),
    originOutros: number(raw?.originOutros),
  };
  return { rows, total, aggregates, page, pageSize };
}
