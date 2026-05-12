import { db } from '@/lib/db';
import { monthlyPayments, type NewMonthlyPayment } from '@/lib/db/schema/finance';
import { associates } from '@/lib/db/schema/associates';
import { and, eq, sql } from 'drizzle-orm';

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

export async function upsertMonthlyPayment(payment: NewMonthlyPayment) {
  return db
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

export async function getAssociatesWithPayments(year: number, month: number) {
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
    .where(eq(associates.associationStatus, 'ativo'))
    .orderBy(associates.fullName);
}
