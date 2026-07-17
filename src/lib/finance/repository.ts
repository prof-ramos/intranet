import { isDomesticCountrySql, isExteriorCountrySql } from '@/lib/associates/location-country';
import { db, type DbExecutor } from '@/lib/db';
import {
  monthlyPayments,
  paymentStatus,
  type MonthlyPayment,
  type NewMonthlyPayment,
} from '@/lib/db/schema/finance';
import { associates } from '@/lib/db/schema/associates';
import { and, asc, desc, eq, ilike, lt, or, sql } from 'drizzle-orm';
import { escapeLikePattern } from '@/lib/db/like-pattern';
import { effectivePaymentMethodSql } from './effective-payment';
import { getBusinessDateParts } from '@/lib/utils/date';
import { normalizePagination } from '@/lib/pagination';

export interface PaymentHistoryItem {
  year: number;
  month: number;
  status: string;
  paymentMethod: string | null;
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
  boletoPix: number;
  paymentRecords: number;
}

export async function findMonthlyPayment(associateId: number, year: number, month: number) {
  const rows = await db
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

export async function upsertMonthlyPayment(payment: NewMonthlyPayment, executor: DbExecutor = db) {
  return executor
    .insert(monthlyPayments)
    .values(payment)
    .onConflictDoUpdate({
      target: [monthlyPayments.associateId, monthlyPayments.year, monthlyPayments.month],
      set: {
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        cancelledAt: payment.cancelledAt ?? null,
        cancellationReason: payment.cancellationReason ?? null,
        cancelledBy: payment.cancelledBy ?? null,
        updatedBy: payment.updatedBy,
        updatedAt: sql`now()`,
      },
    })
    .returning();
}

export async function insertMonthlyPaymentsIfMissing(
  payments: NewMonthlyPayment[],
  executor: DbExecutor = db,
) {
  if (payments.length === 0) return [];
  return executor.insert(monthlyPayments).values(payments).onConflictDoNothing().returning();
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
      updatedAt: monthlyPayments.updatedAt,
    })
    .from(associates)
    .leftJoin(monthlyPayments, joinCondition)
    .where(where)
    .orderBy(asc(associates.fullName), asc(associates.id))
    .offset((page - 1) * pageSize)
    .limit(pageSize);

  const countQuery = db
    .select({ total: sql<number>`count(*)` })
    .from(associates)
    .leftJoin(monthlyPayments, joinCondition)
    .where(where);

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
      boletoPix: sql<number>`count(*) filter (where ${effectiveMethod} in ('boleto', 'pix'))`,
      paymentRecords: sql<number>`count(${monthlyPayments.id})`,
    })
    .from(associates)
    .leftJoin(monthlyPayments, joinCondition)
    .where(where);

  const [rows, countRows, aggregateRows] = await Promise.all([
    rowsQuery,
    countQuery,
    aggregatesQuery,
  ]);
  const total = Number(countRows[0]?.total ?? 0);
  const raw = aggregateRows[0];
  const number = (value: number | undefined) => Number(value ?? 0);
  const aggregates: MonthlyPaymentsAggregates = {
    total: number(raw?.total),
    pagos: number(raw?.pagos),
    pendentes: number(raw?.pendentes),
    atrasados: number(raw?.atrasados),
    isentos: number(raw?.isentos),
    cancelados: number(raw?.cancelados),
    exterior: number(raw?.exterior),
    folha: number(raw?.folha),
    boletoPix: number(raw?.boletoPix),
    paymentRecords: number(raw?.paymentRecords),
  };
  return { rows, total, aggregates, page, pageSize };
}
