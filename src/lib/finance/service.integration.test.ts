import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, associates, auditLogs, domainEvents, monthlyPayments } from '@/lib/db/schema';
import { ConcurrencyConflictError } from '@/lib/errors';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { cancelMonthlyPayment, updateMonthlyPayment } from './service';
import { getAssociatesWithPayments } from './repository';

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
        amount: '1.00',
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
    const audits = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'monthly_payment'), eq(auditLogs.entityId, fixture.id)));

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
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      performedBy: requireAdminId(),
      action: 'update',
      entityType: 'monthly_payment',
      entityId: fixture.id,
      changes: {
        old: { status: 'pendente', paymentMethod: 'pix' },
        new: { status: 'pago', paymentMethod: 'pix' },
      },
      metadata: {
        associateId: requireAssociateId(),
        year: fixture.year,
        month: fixture.month,
      },
    });
    expect(JSON.stringify(audits[0])).not.toMatch(/cpf|siape|address/i);
  });

  it('applies the update when expectedUpdatedAt matches the current row (F-007 happy path)', async () => {
    // Regression test: `updated_at` is a microsecond-precision timestamptz, but
    // any caller deriving `expectedUpdatedAt` from a JS Date/toISOString() (as
    // every real caller does) only carries millisecond precision. Before the
    // setWhere predicate truncated the column to milliseconds, this exact,
    // legitimate, non-stale value would be rejected as a false conflict on
    // every single call.
    const [fixture] = await db
      .insert(monthlyPayments)
      .values({
        associateId: requireAssociateId(),
        year: 2098,
        month: 4,
        status: 'pendente',
        paymentMethod: 'pix',
        amount: '1.00',
        updatedBy: requireAdminId(),
      })
      .returning();
    paymentIds.push(fixture.id);

    const updated = await updateMonthlyPayment(
      requireAdminId(),
      {
        associateId: requireAssociateId(),
        year: fixture.year,
        month: fixture.month,
        status: 'pago',
        paymentMethod: 'pix',
      },
      fixture.updatedAt.toISOString(),
    );

    expect(updated.status).toBe('pago');

    const [persisted] = await db
      .select()
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, fixture.id));
    expect(persisted.status).toBe('pago');
  });

  it('records structured BRL fields and audits their old/new values atomically', async () => {
    const [fixture] = await db
      .insert(monthlyPayments)
      .values({
        associateId: requireAssociateId(),
        year: 2098,
        month: 5,
        status: 'pendente',
        paymentMethod: 'pix',
        origin: 'outros',
        notes: 'Aguardando conferência',
        updatedBy: requireAdminId(),
      })
      .returning();
    paymentIds.push(fixture.id);

    const updated = await updateMonthlyPayment(
      requireAdminId(),
      {
        associateId: requireAssociateId(),
        year: fixture.year,
        month: fixture.month,
        status: 'pago',
        paymentMethod: 'pix',
        amount: '125,50',
        origin: 'sigepe',
        notes: 'Conferido no relatório SIGEPE',
        paidAt: '2020-01-01',
      },
      fixture.updatedAt.toISOString(),
    );

    const [persisted] = await db
      .select()
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, fixture.id));
    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'monthly_payment'), eq(auditLogs.entityId, fixture.id)));

    expect(updated.amount).toBe('125.50');
    expect(updated.origin).toBe('sigepe');
    expect(updated.notes).toBe('Conferido no relatório SIGEPE');
    expect(persisted.amount).toBe('125.50');
    expect(persisted.paidAt?.toISOString()).toBe('2020-01-01T03:00:00.000Z');
    expect(audit.changes).toMatchObject({
      old: { amount: null, origin: 'outros', notes: 'Aguardando conferência' },
      new: { amount: '125.50', origin: 'sigepe', notes: 'Conferido no relatório SIGEPE' },
    });
  });

  it('creates a manual payment with old null and redacts textual PII from its audit', async () => {
    const notes =
      'CPF 123.456.789-01 SIAPE 1234567 email pessoa@example.test token segredo-sintetico';
    const created = await updateMonthlyPayment(requireAdminId(), {
      associateId: requireAssociateId(),
      year: 2098,
      month: 8,
      status: 'pago',
      paymentMethod: 'pix',
      amount: '90,25',
      origin: 'comprovante',
      notes,
      paidAt: '2020-01-04',
    });
    paymentIds.push(created.id);

    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'monthly_payment'), eq(auditLogs.entityId, created.id)));

    expect(created.notes).toBe(notes);
    expect(audit).toMatchObject({
      performedBy: requireAdminId(),
      action: 'create',
      entityType: 'monthly_payment',
      entityId: created.id,
      changes: {
        old: null,
        new: {
          amount: '90.25',
          origin: 'comprovante',
          notes: 'CPF [cpf] [siape] email [email] [token]',
        },
      },
      metadata: { associateId: requireAssociateId(), year: 2098, month: 8 },
    });
    expect(JSON.stringify(audit)).not.toContain('123.456.789-01');
    expect(JSON.stringify(audit)).not.toContain('1234567');
    expect(JSON.stringify(audit)).not.toContain('pessoa@example.test');
    expect(JSON.stringify(audit)).not.toContain('segredo-sintetico');
  });

  it('cancels without deleting the structured record or counting it as received', async () => {
    const [fixture] = await db
      .insert(monthlyPayments)
      .values({
        associateId: requireAssociateId(),
        year: 2098,
        month: 6,
        status: 'pago',
        paymentMethod: 'boleto',
        amount: '80.00',
        origin: 'comprovante',
        paidAt: new Date('2020-01-02T03:00:00.000Z'),
        updatedBy: requireAdminId(),
      })
      .returning();
    paymentIds.push(fixture.id);

    await cancelMonthlyPayment(requireAdminId(), fixture.id, 'Lançamento duplicado');

    const [persisted] = await db
      .select()
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, fixture.id));
    expect(persisted.status).toBe('cancelado');
    expect(persisted.amount).toBe('80.00');
    expect(persisted.cancelledAt).not.toBeNull();
    expect(persisted.cancelledBy).toBe(requireAdminId());

    const summary = await getAssociatesWithPayments(fixture.year, fixture.month);
    expect(summary.aggregates.cancelados).toBe(1);
    expect(summary.aggregates.pagos).toBe(0);
    expect(summary.aggregates.valorRecebido).toBe('0.00');
  });

  it('rejects a stale cancellation without changing the payment', async () => {
    const [fixture] = await db
      .insert(monthlyPayments)
      .values({
        associateId: requireAssociateId(),
        year: 2098,
        month: 7,
        status: 'pago',
        paymentMethod: 'pix',
        amount: '50.00',
        paidAt: new Date('2020-01-03T03:00:00.000Z'),
        updatedBy: requireAdminId(),
      })
      .returning();
    paymentIds.push(fixture.id);

    await expect(
      cancelMonthlyPayment(
        requireAdminId(),
        fixture.id,
        'Tentativa com versão antiga',
        '2000-01-01T00:00:00.000Z',
      ),
    ).rejects.toBeInstanceOf(ConcurrencyConflictError);

    const [persisted] = await db
      .select({ status: monthlyPayments.status, cancelledAt: monthlyPayments.cancelledAt })
      .from(monthlyPayments)
      .where(eq(monthlyPayments.id, fixture.id));
    expect(persisted.status).toBe('pago');
    expect(persisted.cancelledAt).toBeNull();
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
    const audits = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'monthly_payment'), eq(auditLogs.entityId, fixture.id)));

    expect(persisted.status).toBe('pendente');
    expect(persisted.paidAt).toBeNull();
    expect(events).toEqual([]);
    expect(audits).toEqual([]);
  });
});
