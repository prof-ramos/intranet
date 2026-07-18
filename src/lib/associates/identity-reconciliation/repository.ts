import { eq, inArray, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/lib/db';
import {
  activities,
  associates,
  auditLogs,
  dependents,
  healthAgreements,
  legalConsultations,
  legalProcesses,
  monthlyPayments,
} from '@/lib/db/schema';
import {
  buildCanonicalPatch,
  emptyRelationships,
  type AssociateIdentitySnapshot,
  type ReconciliationPlan,
  type RelationshipName,
  type RelationshipSnapshot,
} from './policy';

const RECONCILIATION_LOCK_NAMESPACE = 0x41534f46; // ASOF
const RECONCILIATION_LOCK_KEY = 0x49445243; // IDRC

const EXPECTED_ASSOCIATE_FOREIGN_KEYS = new Set([
  'public.activities.associate_id',
  'public.monthly_payments.associate_id',
  'public.legal_consultations.associate_id',
  'public.legal_processes.associate_id',
  'public.dependents.associate_id',
  'public.health_agreements.associate_id',
]);

export interface ReconciliationSnapshot {
  associates: AssociateIdentitySnapshot[];
  relationships: Map<number, RelationshipSnapshot>;
  foreignKeyInventoryMismatch: string[];
}

function toIdentitySnapshot(row: typeof associates.$inferSelect): AssociateIdentitySnapshot {
  const {
    sourceRowNumber: _sourceRowNumber,
    sourcePayload: _sourcePayload,
    numberOfDependents: _numberOfDependents,
    updatedAt: _updatedAt,
    ...snapshot
  } = row;
  return snapshot;
}

async function loadForeignKeyInventory(tx: DbExecutor): Promise<string[]> {
  const rows = await tx.execute(sql<{ reference: string }>`
    select
      format('%I.%I.%I', namespace.nspname, relation.relname, attribute.attname) as reference
    from pg_constraint constraint_row
    join pg_class relation on relation.oid = constraint_row.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join lateral unnest(constraint_row.conkey) with ordinality as constrained(attnum, ordinal)
      on true
    join pg_attribute attribute
      on attribute.attrelid = constraint_row.conrelid
     and attribute.attnum = constrained.attnum
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'public.associates'::regclass
    order by reference
  `);
  const actual = new Set<string>([...rows].map((row) => (row as { reference: string }).reference));
  return [
    ...[...actual].filter((reference) => !EXPECTED_ASSOCIATE_FOREIGN_KEYS.has(reference)),
    ...[...EXPECTED_ASSOCIATE_FOREIGN_KEYS]
      .filter((reference) => !actual.has(reference))
      .map((reference) => `missing:${reference}`),
  ].sort();
}

export async function acquireReconciliationLock(tx: DbExecutor): Promise<void> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(${RECONCILIATION_LOCK_NAMESPACE}, ${RECONCILIATION_LOCK_KEY})`,
  );
}

/**
 * Freeze every table that contributes to the evidence or is mutated by apply.
 * SHARE ROW EXCLUSIVE conflicts with normal INSERT/UPDATE/DELETE table locks,
 * preventing a non-cooperating application write from becoming an invisible
 * phantom after the repeatable-read snapshot is taken.
 */
export async function acquireReconciliationWriteBarrier(tx: DbExecutor): Promise<void> {
  await tx.execute(sql`
    lock table
      public.associates,
      public.activities,
      public.monthly_payments,
      public.legal_consultations,
      public.legal_processes,
      public.dependents,
      public.health_agreements
    in share row exclusive mode
  `);
}

export async function loadReconciliationSnapshot(
  tx: DbExecutor,
  options: { forUpdate: boolean },
): Promise<ReconciliationSnapshot> {
  const associateQuery = tx.select().from(associates).orderBy(associates.id);
  const associateRows = options.forUpdate
    ? await associateQuery.for('update')
    : await associateQuery;
  const identityRows = associateRows.map(toIdentitySnapshot);
  const relationships = new Map<number, RelationshipSnapshot>(
    identityRows.map((row) => [row.id, emptyRelationships()]),
  );
  const ids = identityRows.map((row) => row.id);

  if (ids.length > 0) {
    const activityRows = await tx
      .select({ id: activities.id, associateId: activities.associateId })
      .from(activities)
      .where(inArray(activities.associateId, ids))
      .orderBy(activities.id);
    const paymentRows = await tx
      .select({
        id: monthlyPayments.id,
        associateId: monthlyPayments.associateId,
        year: monthlyPayments.year,
        month: monthlyPayments.month,
      })
      .from(monthlyPayments)
      .where(inArray(monthlyPayments.associateId, ids))
      .orderBy(monthlyPayments.id);
    const consultationRows = await tx
      .select({ id: legalConsultations.id, associateId: legalConsultations.associateId })
      .from(legalConsultations)
      .where(inArray(legalConsultations.associateId, ids))
      .orderBy(legalConsultations.id);
    const processRows = await tx
      .select({ id: legalProcesses.id, associateId: legalProcesses.associateId })
      .from(legalProcesses)
      .where(inArray(legalProcesses.associateId, ids))
      .orderBy(legalProcesses.id);
    const dependentRows = await tx
      .select({ id: dependents.id, associateId: dependents.associateId })
      .from(dependents)
      .where(inArray(dependents.associateId, ids))
      .orderBy(dependents.id);
    const agreementRows = await tx
      .select({ id: healthAgreements.id, associateId: healthAgreements.associateId })
      .from(healthAgreements)
      .where(inArray(healthAgreements.associateId, ids))
      .orderBy(healthAgreements.id);

    for (const row of activityRows) {
      if (row.associateId !== null)
        relationships.get(row.associateId)!.activities.push({ id: row.id });
    }
    for (const row of paymentRows) {
      relationships.get(row.associateId)!.monthlyPayments.push({
        id: row.id,
        year: row.year,
        month: row.month,
      });
    }
    for (const row of consultationRows) {
      if (row.associateId !== null) {
        relationships.get(row.associateId)!.legalConsultations.push({ id: row.id });
      }
    }
    for (const row of processRows) {
      if (row.associateId !== null)
        relationships.get(row.associateId)!.legalProcesses.push({ id: row.id });
    }
    for (const row of dependentRows)
      relationships.get(row.associateId)!.dependents.push({ id: row.id });
    for (const row of agreementRows) {
      relationships.get(row.associateId)!.healthAgreements.push({ id: row.id });
    }
  }

  return {
    associates: identityRows,
    relationships,
    foreignKeyInventoryMismatch: await loadForeignKeyInventory(tx),
  };
}

async function assertNoKnownReferences(tx: DbExecutor, absorbedIds: number[]): Promise<void> {
  const checks = [
    await tx
      .select({ id: activities.id })
      .from(activities)
      .where(inArray(activities.associateId, absorbedIds))
      .limit(1),
    await tx
      .select({ id: monthlyPayments.id })
      .from(monthlyPayments)
      .where(inArray(monthlyPayments.associateId, absorbedIds))
      .limit(1),
    await tx
      .select({ id: legalConsultations.id })
      .from(legalConsultations)
      .where(inArray(legalConsultations.associateId, absorbedIds))
      .limit(1),
    await tx
      .select({ id: legalProcesses.id })
      .from(legalProcesses)
      .where(inArray(legalProcesses.associateId, absorbedIds))
      .limit(1),
    await tx
      .select({ id: dependents.id })
      .from(dependents)
      .where(inArray(dependents.associateId, absorbedIds))
      .limit(1),
    await tx
      .select({ id: healthAgreements.id })
      .from(healthAgreements)
      .where(inArray(healthAgreements.associateId, absorbedIds))
      .limit(1),
  ];
  if (checks.some((rows) => rows.length > 0)) throw new Error('RECONCILIATION_REFERENCE_REMAINS');
}

export async function applyReconciliationPlan(
  tx: DbExecutor,
  plan: ReconciliationPlan,
  hooks: { afterReparent?: () => Promise<void> } = {},
): Promise<void> {
  for (const execution of plan.executionComponents) {
    const canonicalId = execution.canonical.id;
    const absorbedIds = execution.absorbed.map((row) => row.id);
    if (absorbedIds.length === 0) continue;
    const movedCounts: Record<RelationshipName, number> = {
      activities: 0,
      monthlyPayments: 0,
      legalConsultations: 0,
      legalProcesses: 0,
      dependents: 0,
      healthAgreements: 0,
    };

    movedCounts.activities = (
      await tx
        .update(activities)
        .set({ associateId: canonicalId })
        .where(inArray(activities.associateId, absorbedIds))
        .returning({ id: activities.id })
    ).length;
    movedCounts.monthlyPayments = (
      await tx
        .update(monthlyPayments)
        .set({ associateId: canonicalId })
        .where(inArray(monthlyPayments.associateId, absorbedIds))
        .returning({ id: monthlyPayments.id })
    ).length;
    movedCounts.legalConsultations = (
      await tx
        .update(legalConsultations)
        .set({ associateId: canonicalId })
        .where(inArray(legalConsultations.associateId, absorbedIds))
        .returning({ id: legalConsultations.id })
    ).length;
    movedCounts.legalProcesses = (
      await tx
        .update(legalProcesses)
        .set({ associateId: canonicalId })
        .where(inArray(legalProcesses.associateId, absorbedIds))
        .returning({ id: legalProcesses.id })
    ).length;
    movedCounts.dependents = (
      await tx
        .update(dependents)
        .set({ associateId: canonicalId })
        .where(inArray(dependents.associateId, absorbedIds))
        .returning({ id: dependents.id })
    ).length;
    movedCounts.healthAgreements = (
      await tx
        .update(healthAgreements)
        .set({ associateId: canonicalId })
        .where(inArray(healthAgreements.associateId, absorbedIds))
        .returning({ id: healthAgreements.id })
    ).length;

    await hooks.afterReparent?.();
    await assertNoKnownReferences(tx, absorbedIds);
    const deleted = await tx
      .delete(associates)
      .where(inArray(associates.id, absorbedIds))
      .returning({ id: associates.id });
    if (deleted.length !== absorbedIds.length) throw new Error('RECONCILIATION_DELETE_MISMATCH');

    const patch = buildCanonicalPatch(execution.canonical, execution.absorbed);
    const [{ count: dependentCount }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(dependents)
      .where(inArray(dependents.associateId, [canonicalId]));
    await tx
      .update(associates)
      .set({ ...patch, numberOfDependents: dependentCount })
      .where(eq(associates.id, canonicalId));

    await tx.insert(auditLogs).values({
      action: 'associate_identity_reconciled',
      entityType: 'associate',
      entityId: canonicalId,
      performedBy: null,
      metadata: {
        absorbedAssociateIds: absorbedIds,
        reparentedCounts: movedCounts,
      },
    });
  }
}
