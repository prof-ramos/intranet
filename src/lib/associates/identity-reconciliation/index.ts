import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { buildReconciliationPlan, type SafeReconciliationReport } from './policy';
import {
  acquireReconciliationLock,
  acquireReconciliationWriteBarrier,
  applyReconciliationPlan,
  loadReconciliationSnapshot,
} from './repository';

export type ReconcileAssociateIdentitiesInput =
  | { mode?: 'report' }
  | { mode: 'apply'; evidenceHash: string };

export class AssociateIdentityReconciliationError extends Error {
  constructor(
    public readonly code:
      | 'AMBIGUOUS_COMPONENTS'
      | 'EVIDENCE_HASH_MISMATCH'
      | 'INVALID_EVIDENCE_HASH',
  ) {
    super(code);
    this.name = 'AssociateIdentityReconciliationError';
  }
}

function evidenceMatches(expected: string, supplied: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
}

/**
 * Administrative reconciliation seam. The returned value is safe to serialize;
 * private snapshot and execution data never leave this module.
 */
export async function reconcileAssociateIdentities(
  input: ReconcileAssociateIdentitiesInput = { mode: 'report' },
): Promise<SafeReconciliationReport> {
  if (input.mode !== 'apply') {
    return db.transaction(
      async (tx) => {
        const snapshot = await loadReconciliationSnapshot(tx, { forUpdate: false });
        return buildReconciliationPlan({
          associates: snapshot.associates,
          relationships: snapshot.relationships,
          unknownForeignKeys: snapshot.foreignKeyInventoryMismatch,
        }).report;
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  if (!/^[a-f0-9]{64}$/.test(input.evidenceHash)) {
    throw new AssociateIdentityReconciliationError('INVALID_EVIDENCE_HASH');
  }

  return db.transaction(
    async (tx) => {
      await acquireReconciliationLock(tx);
      await acquireReconciliationWriteBarrier(tx);
      const snapshot = await loadReconciliationSnapshot(tx, { forUpdate: true });
      const plan = buildReconciliationPlan({
        associates: snapshot.associates,
        relationships: snapshot.relationships,
        unknownForeignKeys: snapshot.foreignKeyInventoryMismatch,
      });
      if (!evidenceMatches(plan.report.evidenceHash, input.evidenceHash)) {
        throw new AssociateIdentityReconciliationError('EVIDENCE_HASH_MISMATCH');
      }
      if (!plan.canApply) {
        throw new AssociateIdentityReconciliationError('AMBIGUOUS_COMPONENTS');
      }

      await applyReconciliationPlan(tx, plan);
      const after = await loadReconciliationSnapshot(tx, { forUpdate: false });
      return buildReconciliationPlan({
        associates: after.associates,
        relationships: after.relationships,
        unknownForeignKeys: after.foreignKeyInventoryMismatch,
      }).report;
    },
    { isolationLevel: 'repeatable read', accessMode: 'read write' },
  );
}

export type { SafeReconciliationReport } from './policy';
