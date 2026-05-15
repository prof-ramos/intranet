import { db } from '@/lib/db';
import { monthlyPayments, paymentStatus, type NewMonthlyPayment } from '@/lib/db/schema/finance';
import { associates } from '@/lib/db/schema/associates';
import { and, eq, ilike, sql } from 'drizzle-orm';
import { escapeLikePattern } from '@/lib/db/like-pattern';

export interface MonthlyPaymentsFilters {
  q?: string;
  status?: typeof paymentStatus.enumValues[number];
  method?: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
  location?: 'brasil' | 'exterior';
}

export async function getMonthlyPaymentsByMonth(year: number, month: number) {
  return db
    .select({
      id: monthlyPayments.id,
      associateId: monthlyPayments.associateId,
      fullName: associates.fullName,
      paymentMethod: monthlyPayments.paymentMethod,
      status: monthlyPayments.status,
      paidAt: monthlyPayments.paidAt,
    })
    .from(monthlyPayments)
    .innerJoin(associates, eq(monthlyPayments.associateId, associates.id))
    .where(and(eq(monthlyPayments.year, year), eq(monthlyPayments.month, month)));
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

export async function upsertMonthlyPayment(payment: NewMonthlyPayment, executor: Pick<import('@/lib/db').Tx, 'insert'> = db) {
  return executor
    .insert(monthlyPayments)
    .values(payment)
    .onConflictDoUpdate({
      target: [monthlyPayments.associateId, monthlyPayments.year, monthlyPayments.month],
      set: {
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        updatedBy: payment.updatedBy,
        updatedAt: sql`now()`,
      },
    })
    .returning();
}

function buildNamePattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}

export async function getAssociatesWithPayments(
  year: number,
  month: number,
  filters?: MonthlyPaymentsFilters,
) {
  const conditions = [eq(associates.associationStatus, 'ativo')];

  if (filters?.q && filters.q.trim()) {
    conditions.push(ilike(associates.fullName, buildNamePattern(filters.q.trim())));
  }

  if (filters?.location) {
    if (filters.location === 'brasil') {
      conditions.push(eq(associates.locationCountry, 'Brasil'));
    } else if (filters.location === 'exterior') {
      conditions.push(sql`${associates.locationCountry} IS DISTINCT FROM 'Brasil'`);
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
    conditions.push(eq(monthlyPayments.paymentMethod, filters.method));
  }

  return db
    .select({
      associateId: associates.id,
      fullName: associates.fullName,
      defaultPaymentMethod: associates.paymentMethod,
      siape: associates.siape,
      associationStatus: associates.associationStatus,
      functionalStatus: associates.functionalStatus,
      locationCountry: associates.locationCountry,
      locationCity: associates.locationCity,
      paymentId: monthlyPayments.id,
      paymentStatus: monthlyPayments.status,
      monthPaymentMethod: monthlyPayments.paymentMethod,
      updatedAt: monthlyPayments.updatedAt,
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
    .where(and(...conditions))
    .orderBy(associates.fullName);
}