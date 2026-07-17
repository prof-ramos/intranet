import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, associates, auditLogs, domainEvents, monthlyPayments } from '@/lib/db/schema';
import { ConcurrencyConflictError } from '@/lib/errors';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { updateMonthlyPayment } from './service';

const runId = `${Date.now()}-${process.pid}`;
const paymentIds: number[] = [];
let adminId: number | null = null;
let associateId: number | null = null;

function requireAdminId(): number {
  if (adminId === null) throw new Error('finance admin fixture was not created');
  return adminId;
}

function requireAssociateId(): number {
  if (associateId === null) throw new Error('finance associate fixture was not created');
  return associateId;
}

describe('finance service integration', () => {
  beforeAll(async () => {
    const [admin] = await db
      .insert(admins)
      .values({
        name: 'Admin Financeiro Sintético',
        email: `integration-finance-${runId}@example.test`,
        passwordHash: 'integration-test-placeholder',
        role: 'admin',
      })
      .returning({ id: admins.id });
    adminId = admin.id;

    const [associate] = await db
      .insert(associates)
      .values({
        fullName: 'Oficial Sintético Financeiro',
        siape: `integration-finance-${runId}`,
        associationStatus: 'associado',
        contributionStatus: 'em_dia',
      })
      .returning({ id: associates.id });
    associateId = associate.id;
  });

  afterAll(async () => {
    if (paymentIds.length > 0) {
      await db
        .delete(domainEvents)
        .where(
          and(
            eq(domainEvents.entityType, 'monthly_payment'),
            inArray(domainEvents.entityId, paymentIds),
          ),
        );
      await db
        .delete(auditLogs)
        .where(
          and(eq(auditLogs.entityType, 'monthly_payment'), inArray(auditLogs.entityId, paymentIds)),
        );
      await db.delete(monthlyPayments).where(inArray(monthlyPayments.id, paymentIds));
    }
    if (associateId !== null) await db.delete(associates).where(eq(associates.id, associateId));
    if (adminId !== null) await db.delete(admins).where(eq(admins.id, adminId));
  });

  it('commits a status transition and its outbox event together', async () => {
    const [fixture] = await db
      .insert(monthlyPayments)
      .values({
        associateId: requireAssociateId(),
        year: 2098,
        month: 1,
        status: 'pendente',
        paymentMethod: 'pix',
        updatedBy: requireAdminId(),
      })
      .returning();
    paymentIds.push(fixture.id);

    const updated = await updateMonthlyPayment(requireAdminId(), {
      associateId: requireAssociateId(),
      year: fixture.year,
      month: fixture.month,
      status: 'pago',
      paymentMethod: 'pix',
    });

    const [persisted] = await db
      .select()
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, fixture.id));
    const events = await db
      .select()
      .from(domainEvents)
      .where(
        and(eq(domainEvents.entityType, 'monthly_payment'), eq(domainEvents.entityId, fixture.id)),
      );

    expect(updated.status).toBe('pago');
    expect(persisted.status).toBe('pago');
    expect(persisted.paidAt).not.toBeNull();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: 'monthly_payment.updated' });
    expect(events[0].payload).toMatchObject({
      previousStatus: 'pendente',
      status: 'pago',
      associateId: requireAssociateId(),
    });
  });

  it('rolls back both a payment mutation and its outbox event', async () => {
    let rolledBackPaymentId = 0;

    await expect(
      db.transaction(async (tx) => {
        const [payment] = await tx
          .insert(monthlyPayments)
          .values({
            associateId: requireAssociateId(),
            year: 2098,
            month: 2,
            status: 'pendente',
            paymentMethod: 'boleto',
            updatedBy: requireAdminId(),
          })
          .returning();
        rolledBackPaymentId = payment.id;

        await emitDomainEvent(
          {
            type: 'monthly_payment.updated',
            entityType: 'monthly_payment',
            entityId: payment.id,
            actorAdminId: requireAdminId(),
            payload: {
              associateId: requireAssociateId(),
              year: payment.year,
              month: payment.month,
              previousStatus: 'pendente',
              status: 'pago',
              paymentMethod: payment.paymentMethod,
              paidAt: new Date().toISOString(),
              links: { app: '/app/financeiro/mensalidades?year=2098&month=2' },
            },
          },
          tx,
        );

        throw new Error('forced rollback after mutation and outbox insert');
      }),
    ).rejects.toThrow('forced rollback');

    const payments = await db
      .select({ id: monthlyPayments.id })
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, rolledBackPaymentId));
    const events = await db
      .select({ id: domainEvents.id })
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.entityType, 'monthly_payment'),
          eq(domainEvents.entityId, rolledBackPaymentId),
        ),
      );

    expect(payments).toEqual([]);
    expect(events).toEqual([]);
  });

  it('rejects a stale updated_at without changing state or emitting an event', async () => {
    const [fixture] = await db
      .insert(monthlyPayments)
      .values({
        associateId: requireAssociateId(),
        year: 2098,
        month: 3,
        status: 'pendente',
        paymentMethod: 'transferencia',
        updatedBy: requireAdminId(),
      })
      .returning();
    paymentIds.push(fixture.id);
    const staleUpdatedAt = fixture.updatedAt.toISOString();

    await db
      .update(monthlyPayments)
      .set({ updatedAt: sql`${monthlyPayments.updatedAt} + interval '1 second'` })
      .where(eq(monthlyPayments.id, fixture.id));

    await expect(
      updateMonthlyPayment(
        requireAdminId(),
        {
          associateId: requireAssociateId(),
          year: fixture.year,
          month: fixture.month,
          status: 'pago',
          paymentMethod: 'transferencia',
        },
        staleUpdatedAt,
      ),
    ).rejects.toBeInstanceOf(ConcurrencyConflictError);

    const [persisted] = await db
      .select()
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, fixture.id));
    const events = await db
      .select({ id: domainEvents.id })
      .from(domainEvents)
      .where(
        and(eq(domainEvents.entityType, 'monthly_payment'), eq(domainEvents.entityId, fixture.id)),
      );

    expect(persisted.status).toBe('pendente');
    expect(persisted.paidAt).toBeNull();
    expect(events).toEqual([]);
  });
});
