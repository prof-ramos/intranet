import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { and, eq, inArray, like, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import {
  activities,
  admins,
  associates,
  auditLogs,
  dependents,
  healthAgreements,
  legalConsultations,
  legalProcesses,
  monthlyPayments,
} from '@/lib/db/schema';
import { reconcileAssociateIdentities } from './index';
import { buildReconciliationPlan } from './policy';
import {
  acquireReconciliationWriteBarrier,
  applyReconciliationPlan,
  loadReconciliationSnapshot,
} from './repository';

const hasTestEnv = existsSync(resolve(process.cwd(), '.env.test.local'));
const runId = `${Date.now()}-${process.pid}`;
const sourcePrefix = `INT-RECON-${runId}`;
let adminId = 0;

async function createOfficial(
  suffix: string,
  values: Partial<typeof associates.$inferInsert> = {},
): Promise<number> {
  const [row] = await db
    .insert(associates)
    .values({
      sourceRowNumber: `${sourcePrefix}-${suffix}`,
      fullName: 'Oficial Sintético Reconciliação',
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      paymentMethod: 'folha',
      ...values,
    })
    .returning({ id: associates.id });
  return row.id;
}

async function cleanup() {
  const rows = await db
    .select({ id: associates.id })
    .from(associates)
    .where(like(associates.sourceRowNumber, `${sourcePrefix}%`));
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db
      .delete(auditLogs)
      .where(and(eq(auditLogs.entityType, 'associate'), inArray(auditLogs.entityId, ids)));
    await db.delete(activities).where(inArray(activities.associateId, ids));
    await db.delete(monthlyPayments).where(inArray(monthlyPayments.associateId, ids));
    await db.delete(legalConsultations).where(inArray(legalConsultations.associateId, ids));
    await db.delete(legalProcesses).where(inArray(legalProcesses.associateId, ids));
    await db.delete(dependents).where(inArray(dependents.associateId, ids));
    await db.delete(healthAgreements).where(inArray(healthAgreements.associateId, ids));
    await db.delete(associates).where(inArray(associates.id, ids));
  }
}

describe.skipIf(!hasTestEnv)('associate identity reconciliation PostgreSQL', () => {
  beforeAll(async () => {
    await db.execute(sql`DROP INDEX IF EXISTS idx_associates_cpf_hash`);
    await db.execute(sql`DROP INDEX IF EXISTS idx_associates_siape_hash`);
    await db.execute(sql`DROP INDEX IF EXISTS idx_associates_primary_email_hash`);
    const [admin] = await db
      .insert(admins)
      .values({
        name: 'Admin Sintético Reconciliação',
        email: `int-reconcile-${runId}@test.local`,
        passwordHash: 'not-a-login-password',
        role: 'admin',
      })
      .returning({ id: admins.id });
    adminId = admin.id;
  });

  afterAll(async () => {
    await cleanup();
    if (adminId) await db.delete(admins).where(eq(admins.id, adminId));
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_associates_cpf_hash ON associates (cpf_hash)`,
    );
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_associates_siape_hash ON associates (siape_hash)`,
    );
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_associates_primary_email_hash ON associates (primary_email_hash)`,
    );
  });

  afterEach(cleanup);

  it('reparents all six known relationships, fills nulls, audits, and becomes idempotent', async () => {
    const sharedIdentity = `cpf-int-${runId}-success`;
    const canonicalId = await createOfficial('success-canonical', {
      cpfHash: sharedIdentity,
      assignment: 'SERE',
      assignmentStartDate: '2020-01-01',
      locationCity: 'Brasília',
      locationCountry: 'Brasil',
      associationCategory: 'efetivo',
      classPattern: 'Especial V',
      birthCity: 'Cidade sintética',
      addressState: 'DF',
      createdAt: new Date('2018-01-01T00:00:00Z'),
    });
    const absorbedId = await createOfficial('success-absorbed', {
      cpfHash: sharedIdentity,
      secondaryEmail: `synthetic-${runId}@test.local`,
      createdAt: new Date('2020-01-01T00:00:00Z'),
    });

    await db
      .insert(activities)
      .values({ title: 'Atividade sintética', associateId: absorbedId, createdBy: adminId });
    await db.insert(monthlyPayments).values({ associateId: absorbedId, year: 2026, month: 7 });
    await db.insert(legalConsultations).values({
      internalNumber: `CONS-RECON-${runId}`,
      title: 'Consulta sintética',
      questionSummary: 'Resumo sintético',
      associateId: absorbedId,
      createdBy: adminId,
    });
    await db.insert(legalProcesses).values({
      internalNumber: `PROC-RECON-${runId}`,
      title: 'Processo sintético',
      type: 'administrativo',
      subtype: 'mre',
      associateId: absorbedId,
      createdBy: adminId,
    });
    await db
      .insert(dependents)
      .values({ associateId: absorbedId, name: 'Dependente sintético', relationship: 'teste' });
    await db
      .insert(healthAgreements)
      .values({ associateId: absorbedId, provider: 'Convênio sintético' });

    const before = await reconcileAssociateIdentities();
    const target = before.components.find((component) =>
      component.associateIds.includes(canonicalId),
    );
    expect(target).toMatchObject({ canonicalId, absorbedIds: [absorbedId], eligible: true });

    const after = await reconcileAssociateIdentities({
      mode: 'apply',
      evidenceHash: before.evidenceHash,
    });
    expect(after.summary.componentCount).toBe(0);

    const [canonical] = await db.select().from(associates).where(eq(associates.id, canonicalId));
    expect(canonical.secondaryEmail).toBe(`synthetic-${runId}@test.local`);
    expect(canonical.numberOfDependents).toBe(1);
    expect(await db.select().from(associates).where(eq(associates.id, absorbedId))).toHaveLength(0);
    for (const table of [
      activities,
      monthlyPayments,
      legalConsultations,
      legalProcesses,
      dependents,
      healthAgreements,
    ]) {
      expect(await db.select().from(table).where(eq(table.associateId, canonicalId))).toHaveLength(
        1,
      );
    }

    const [audit] = await db
      .select({ action: auditLogs.action, metadata: auditLogs.metadata })
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'associate'), eq(auditLogs.entityId, canonicalId)));
    expect(audit).toEqual({
      action: 'associate_identity_reconciled',
      metadata: {
        absorbedAssociateIds: [absorbedId],
        reparentedCounts: {
          activities: 1,
          monthlyPayments: 1,
          legalConsultations: 1,
          legalProcesses: 1,
          dependents: 1,
          healthAgreements: 1,
        },
      },
    });

    const secondReport = await reconcileAssociateIdentities();
    expect(secondReport.summary.componentCount).toBe(0);
  });

  it('rejects drifted evidence without changing either duplicate', async () => {
    const sharedIdentity = `cpf-int-${runId}-drift`;
    const first = await createOfficial('drift-a', { cpfHash: sharedIdentity });
    const second = await createOfficial('drift-b', { cpfHash: sharedIdentity });
    const report = await reconcileAssociateIdentities();
    const wrongHash = report.evidenceHash.replace(/^./, report.evidenceHash[0] === 'a' ? 'b' : 'a');

    await expect(
      reconcileAssociateIdentities({ mode: 'apply', evidenceHash: wrongHash }),
    ).rejects.toMatchObject({
      code: 'EVIDENCE_HASH_MISMATCH',
    });
    expect(
      await db
        .select()
        .from(associates)
        .where(inArray(associates.id, [first, second])),
    ).toHaveLength(2);
  });

  it('rolls back PostgreSQL writes when execution fails after reparenting', async () => {
    const sharedIdentity = `cpf-int-${runId}-rollback`;
    const canonicalId = await createOfficial('rollback-canonical', {
      cpfHash: sharedIdentity,
      assignment: 'SERE',
      createdAt: new Date('2018-01-01T00:00:00Z'),
    });
    const absorbedId = await createOfficial('rollback-absorbed', {
      cpfHash: sharedIdentity,
      createdAt: new Date('2020-01-01T00:00:00Z'),
    });
    await db
      .insert(activities)
      .values({ title: 'Rollback sintético', associateId: absorbedId, createdBy: adminId });

    await expect(
      db.transaction(async (tx) => {
        const snapshot = await loadReconciliationSnapshot(tx, { forUpdate: true });
        const plan = buildReconciliationPlan({
          associates: snapshot.associates,
          relationships: snapshot.relationships,
          unknownForeignKeys: snapshot.foreignKeyInventoryMismatch,
        });
        await applyReconciliationPlan(tx, plan, {
          afterReparent: async () => {
            throw new Error('SYNTHETIC_ROLLBACK');
          },
        });
      }),
    ).rejects.toThrow('SYNTHETIC_ROLLBACK');

    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.title, 'Rollback sintético'));
    expect(activity.associateId).toBe(absorbedId);
    expect(
      await db
        .select()
        .from(associates)
        .where(inArray(associates.id, [canonicalId, absorbedId])),
    ).toHaveLength(2);
  });

  it('rolls back the entire apply when the mandatory audit insert fails', async () => {
    const sharedIdentity = `cpf-int-${runId}-audit-rollback`;
    const canonicalId = await createOfficial('audit-rollback-canonical', {
      cpfHash: sharedIdentity,
      assignment: 'SERE',
      createdAt: new Date('2018-01-01T00:00:00Z'),
    });
    const absorbedId = await createOfficial('audit-rollback-absorbed', {
      cpfHash: sharedIdentity,
      createdAt: new Date('2020-01-01T00:00:00Z'),
    });
    await db.insert(activities).values({
      title: 'Audit rollback sintético',
      associateId: absorbedId,
      createdBy: adminId,
    });
    const report = await reconcileAssociateIdentities();

    await db.execute(sql`
      create or replace function reconciliation_reject_audit_test()
      returns trigger language plpgsql as $$
      begin
        if NEW.action = 'associate_identity_reconciled' then
          raise exception 'synthetic audit rejection';
        end if;
        return NEW;
      end
      $$
    `);
    await db.execute(sql`
      create trigger reconciliation_reject_audit_test
      before insert on audit_logs
      for each row execute function reconciliation_reject_audit_test()
    `);
    try {
      await expect(
        reconcileAssociateIdentities({ mode: 'apply', evidenceHash: report.evidenceHash }),
      ).rejects.toBeDefined();
    } finally {
      await db.execute(sql`drop trigger if exists reconciliation_reject_audit_test on audit_logs`);
      await db.execute(sql`drop function if exists reconciliation_reject_audit_test()`);
    }

    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.title, 'Audit rollback sintético'));
    expect(activity.associateId).toBe(absorbedId);
    expect(
      await db
        .select()
        .from(associates)
        .where(inArray(associates.id, [canonicalId, absorbedId])),
    ).toHaveLength(2);
  });

  it('blocks every component when one duplicate identity is ambiguous', async () => {
    const eligibleIdentity = `cpf-int-${runId}-eligible-stop`;
    const eligibleIds = [
      await createOfficial('eligible-stop-a', { cpfHash: eligibleIdentity }),
      await createOfficial('eligible-stop-b', { cpfHash: eligibleIdentity }),
    ];
    const ambiguousIdentity = `cpf-int-${runId}-ambiguous-stop`;
    const ambiguousIds = [
      await createOfficial('ambiguous-stop-a', { cpfHash: ambiguousIdentity, fullName: 'Nome Um' }),
      await createOfficial('ambiguous-stop-b', {
        cpfHash: ambiguousIdentity,
        fullName: 'Nome Dois',
      }),
    ];
    await db.insert(monthlyPayments).values([
      { associateId: ambiguousIds[0], year: 2025, month: 6 },
      { associateId: ambiguousIds[1], year: 2025, month: 6 },
    ]);

    const report = await reconcileAssociateIdentities();
    const ambiguous = report.components.find((component) =>
      component.associateIds.includes(ambiguousIds[0]),
    );
    expect(ambiguous).toMatchObject({
      eligible: false,
      conflictCodes: ['MONTHLY_PAYMENT_PERIOD_CONFLICT', 'NORMALIZED_NAME_CONFLICT'],
    });
    await expect(
      reconcileAssociateIdentities({ mode: 'apply', evidenceHash: report.evidenceHash }),
    ).rejects.toMatchObject({ code: 'AMBIGUOUS_COMPONENTS' });
    expect(
      await db
        .select({ id: associates.id })
        .from(associates)
        .where(inArray(associates.id, [...eligibleIds, ...ambiguousIds])),
    ).toHaveLength(4);
  });

  it('fails closed when the PostgreSQL catalog contains an unknown associate foreign key', async () => {
    await db.execute(sql`drop table if exists reconciliation_unknown_fk_test`);
    try {
      await db.execute(sql`
        create table reconciliation_unknown_fk_test (
          id bigint generated always as identity primary key,
          associate_id bigint references associates(id)
        )
      `);
      const report = await reconcileAssociateIdentities();
      expect(report.globalConflictCodes).toEqual(['UNKNOWN_ASSOCIATE_FOREIGN_KEY']);
      expect(JSON.stringify(report)).not.toContain('reconciliation_unknown_fk_test');
    } finally {
      await db.execute(sql`drop table if exists reconciliation_unknown_fk_test`);
    }
  });

  it('waits for the transaction advisory lock before applying a matching report', async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    const sharedIdentity = `cpf-int-${runId}-lock`;
    await createOfficial('lock-a', { cpfHash: sharedIdentity, assignment: 'SERE' });
    await createOfficial('lock-b', { cpfHash: sharedIdentity });
    const report = await reconcileAssociateIdentities();
    const barrier = postgres(databaseUrl, {
      max: 1,
      connection: { application_name: 'identity-reconciliation-lock-test' },
    });
    let release!: () => void;
    const releasePromise = new Promise<void>((resolveRelease) => {
      release = resolveRelease;
    });
    const lockHeld = new Promise<void>((resolveHeld, rejectHeld) => {
      void barrier
        .begin(async (tx) => {
          await tx`select pg_advisory_xact_lock(${0x41534f46}, ${0x49445243})`;
          resolveHeld();
          await releasePromise;
        })
        .catch(rejectHeld);
    });
    await lockHeld;

    let settled = false;
    const applying = reconcileAssociateIdentities({
      mode: 'apply',
      evidenceHash: report.evidenceHash,
    })
      .then((value) => {
        settled = true;
        return value;
      })
      .catch((error) => {
        settled = true;
        throw error;
      });
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    expect(settled).toBe(false);
    release();
    const after = await applying;
    expect(after.summary.componentCount).toBeGreaterThanOrEqual(0);
    await barrier.end({ timeout: 5 });
  });

  it('blocks non-cooperating writes while the reconciliation write barrier is held', async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    const writer = postgres(databaseUrl, {
      max: 1,
      connection: { application_name: 'identity-reconciliation-writer-test' },
    });
    let inserted = false;
    let inserting!: Promise<void>;

    await db.transaction(async (tx) => {
      await acquireReconciliationWriteBarrier(tx);
      inserting = writer`
        insert into associates (
          source_row_number,
          full_name,
          association_status,
          contribution_status,
          payment_method
        ) values (
          ${`${sourcePrefix}-blocked-writer`},
          'Oficial Sintético Reconciliação',
          'associado',
          'em_dia',
          'folha'
        )
      `.then(() => {
        inserted = true;
      });
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      expect(inserted).toBe(false);
    });

    await inserting;
    expect(inserted).toBe(true);
    await writer.end({ timeout: 5 });
  });
});
