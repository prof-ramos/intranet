import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, auditLogs, domainEvents, oficios } from '@/lib/db/schema';
import {
  claimAssinafySubmission,
  failStaleAssinafySubmission,
  INTERRUPTED_ASSINAFY_SUBMISSION_ERROR,
  recordAssinafyReconciliationContext,
} from '@/lib/assinafy/repository';
import { cancelOfficialLetter as cancelOfficialLetterRecord } from './repository';
import { saveOfficialLetter } from './service';

// Must match repository.lockOfficialLetterSequenceYear namespace ("ASOF").
const OFFICIAL_LETTER_SEQUENCE_LOCK_NAMESPACE = 0x41534f46;

const hasTestEnv = existsSync(resolve(process.cwd(), '.env.test.local'));
const runId = Date.now();
let adminId: number;
let oficioId: number;
const createdOficioIds: number[] = [];

function deferred() {
  let resolvePromise!: () => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<void>((resolveDeferred, rejectDeferred) => {
    resolvePromise = resolveDeferred;
    rejectPromise = rejectDeferred;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function countBlockedSequenceLocks(sqlClient: ReturnType<typeof postgres>) {
  const [row] = await sqlClient<{ count: number }[]>`
    select count(*)::int as count
      from pg_stat_activity
     where application_name = 'asof-intranet'
       and wait_event_type = 'Lock'
       and wait_event = 'advisory'
       and query ilike '%pg_advisory_xact_lock%'
  `;
  return row.count;
}

async function waitForBlockedSequenceLocks(
  sqlClient: ReturnType<typeof postgres>,
  minimum: number,
) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if ((await countBlockedSequenceLocks(sqlClient)) >= minimum) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error(`Timed out waiting for ${minimum} blocked sequence allocations.`);
}

/**
 * Hold the same transaction advisory lock used by saveOfficialLetter so concurrent
 * allocations must queue and cannot complete serially without contending.
 */
async function holdOfficialLetterSequenceLock(
  sqlClient: ReturnType<typeof postgres>,
  year: number,
) {
  const ready = deferred();
  const release = deferred();
  const done = sqlClient
    .begin(async (transaction) => {
      await transaction`
        select pg_advisory_xact_lock(
          ${OFFICIAL_LETTER_SEQUENCE_LOCK_NAMESPACE},
          ${year}
        )
      `;
      ready.resolve();
      await release.promise;
    })
    .catch((error) => {
      ready.reject(error);
      throw error;
    });

  await ready.promise;
  return {
    release: async () => {
      release.resolve();
      await done;
    },
  };
}

describe.skipIf(!hasTestEnv)('oficios service integration', () => {
  let barrierSql: ReturnType<typeof postgres> | undefined;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for oficios integration tests');
    }
    barrierSql = postgres(databaseUrl, {
      max: 2,
      connection: { application_name: 'oficios-integration-barrier' },
    });

    const [a] = await db
      .insert(admins)
      .values({
        name: 'Test Admin',
        email: `int-oficios-${runId}@test.com`,
        passwordHash: 'hash',
        role: 'admin',
      })
      .returning({ id: admins.id });
    adminId = a.id;
    const [oficio] = await db
      .insert(oficios)
      .values({
        number: `OF-INT-CAS-${runId}`,
        year: 2026,
        sequence: Number(String(runId).slice(-8)),
        recipient: 'Destinatário sintético',
        recipientRole: 'Cargo sintético',
        vocativo: 'Senhor',
        letterDate: '17 de julho de 2026',
        subject: 'Teste de claim concorrente',
        itamaratySector: 'TESTE',
        signatoryName: 'Signatário Sintético',
        signatoryRole: 'Cargo sintético',
        bodyRichText: '<p>Conteúdo sintético</p>',
        bodyPlainText: 'Conteúdo sintético',
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning({ id: oficios.id });
    oficioId = oficio.id;
  });

  afterAll(async () => {
    const entityIds = [...createdOficioIds, oficioId].filter((id) => Number.isFinite(id));
    if (entityIds.length > 0) {
      // saveOfficialLetter(status=gerado) emits official_letter.created outbox rows
      // without FK cascade — delete them before the ofícios so dispatcher tests
      // do not reclaim orphan pending events later.
      await db
        .delete(domainEvents)
        .where(
          and(
            eq(domainEvents.entityType, 'official_letter'),
            inArray(domainEvents.entityId, entityIds),
          ),
        );
      await db
        .delete(auditLogs)
        .where(
          and(eq(auditLogs.entityType, 'official_letter'), inArray(auditLogs.entityId, entityIds)),
        );
      await db.delete(oficios).where(inArray(oficios.id, entityIds));
    }
    if (adminId) {
      await db.delete(admins).where(eq(admins.id, adminId));
    }
    if (barrierSql) {
      await barrierSql.end({ timeout: 5 });
    }
  });

  it('service module loads correctly', async () => {
    const svc = await import('./service');
    expect(svc).toBeDefined();
  });

  it('allows exactly one concurrent Assinafy submission claim', async () => {
    const claims = await Promise.all([
      claimAssinafySubmission(oficioId, adminId),
      claimAssinafySubmission(oficioId, adminId),
    ]);

    expect(claims.filter((claim) => claim !== null)).toHaveLength(1);
    expect(claims.filter((claim) => claim === null)).toHaveLength(1);

    const [stored] = await db
      .select({ assinafyStatus: oficios.assinafyStatus })
      .from(oficios)
      .where(eq(oficios.id, oficioId));
    expect(stored.assinafyStatus).toBe('uploading');
  });

  it('serializes concurrent annual sequence allocation in PostgreSQL', async () => {
    if (!barrierSql) {
      throw new Error('barrierSql was not initialized');
    }

    const year = new Date().getFullYear();
    const makeInput = (subject: string) => ({
      recipient: 'Destinatário sintético',
      recipientRole: 'Cargo sintético',
      vocativo: 'Senhor',
      letterDate: '17 de julho de 2026',
      subject,
      itamaratySector: 'TESTE',
      signatoryName: 'Signatário Sintético',
      signatoryRole: 'Cargo sintético',
      bodyRichText: '<p>Conteúdo sintético</p>',
      bodyPlainText: 'Conteúdo sintético',
      status: 'gerado' as const,
      updatedBy: adminId,
    });

    const baselineBlocked = await countBlockedSequenceLocks(barrierSql);
    const barrier = await holdOfficialLetterSequenceLock(barrierSql, year);

    try {
      const firstPromise = saveOfficialLetter(makeInput(`Concorrência A ${runId}`), adminId);
      await waitForBlockedSequenceLocks(barrierSql, baselineBlocked + 1);

      const secondPromise = saveOfficialLetter(makeInput(`Concorrência B ${runId}`), adminId);
      await waitForBlockedSequenceLocks(barrierSql, baselineBlocked + 2);

      await barrier.release();

      const [first, second] = await Promise.all([firstPromise, secondPromise]);
      createdOficioIds.push(first.id, second.id);

      const ordered = [first, second].sort((a, b) => a.sequence - b.sequence);
      expect(ordered[1].sequence).toBe(ordered[0].sequence + 1);
      expect(new Set(ordered.map((oficio) => oficio.number)).size).toBe(2);

      const stored = await db
        .select({ id: oficios.id, sequence: oficios.sequence, number: oficios.number })
        .from(oficios)
        .where(inArray(oficios.id, createdOficioIds));
      expect(stored).toHaveLength(2);
      expect(new Set(stored.map((oficio) => oficio.sequence)).size).toBe(2);
    } catch (error) {
      await barrier.release().catch(() => undefined);
      throw error;
    }
  });
  it('serializes Assinafy claim against cancellation', async () => {
    await db
      .update(oficios)
      .set({ status: 'gerado', assinafyStatus: null })
      .where(eq(oficios.id, oficioId));

    const [claim, cancellation] = await Promise.all([
      claimAssinafySubmission(oficioId, adminId),
      cancelOfficialLetterRecord(oficioId, adminId),
    ]);

    expect([claim, cancellation].filter((result) => result !== null)).toHaveLength(1);
    const [stored] = await db
      .select({ status: oficios.status, assinafyStatus: oficios.assinafyStatus })
      .from(oficios)
      .where(eq(oficios.id, oficioId));
    expect(
      (stored.status === 'gerado' && stored.assinafyStatus === 'uploading') ||
        (stored.status === 'cancelado' && stored.assinafyStatus === null),
    ).toBe(true);
  });

  it('fails an abandoned Assinafy claim without reopening blind retry', async () => {
    await db
      .update(oficios)
      .set({
        status: 'gerado',
        assinafyStatus: 'uploading',
        assinafyDocumentId: null,
        assinafyAssignmentId: null,
        assinafySignerId: null,
        assinafyError: null,
        updatedAt: new Date(Date.now() - 20 * 60 * 1000),
      })
      .where(eq(oficios.id, oficioId));

    const interrupted = await failStaleAssinafySubmission(oficioId, adminId);

    expect(interrupted).toMatchObject({
      assinafyStatus: 'failed',
      assinafyError: INTERRUPTED_ASSINAFY_SUBMISSION_ERROR,
    });

    await db
      .update(oficios)
      .set({
        assinafyStatus: 'uploading',
        assinafyError: null,
        updatedAt: new Date(),
      })
      .where(eq(oficios.id, oficioId));

    await expect(failStaleAssinafySubmission(oficioId, adminId)).resolves.toBeNull();
    const [freshClaim] = await db
      .select({ assinafyStatus: oficios.assinafyStatus })
      .from(oficios)
      .where(eq(oficios.id, oficioId));
    expect(freshClaim.assinafyStatus).toBe('uploading');
  });

  it('records external IDs without overwriting a state that won the claim', async () => {
    await db
      .update(oficios)
      .set({
        status: 'cancelado',
        assinafyStatus: 'failed',
        assinafyDocumentId: null,
        assinafyAssignmentId: null,
        assinafySignerId: null,
      })
      .where(eq(oficios.id, oficioId));

    await recordAssinafyReconciliationContext(oficioId, {
      assinafyDocumentId: `doc-reconcile-${runId}`,
      assinafyAssignmentId: `assignment-reconcile-${runId}`,
      assinafySignerId: `signer-reconcile-${runId}`,
      assinafyError: 'Manual reconciliation required.',
      updatedBy: adminId,
    });

    const [stored] = await db
      .select({
        status: oficios.status,
        assinafyStatus: oficios.assinafyStatus,
        documentId: oficios.assinafyDocumentId,
      })
      .from(oficios)
      .where(eq(oficios.id, oficioId));
    expect(stored).toMatchObject({
      status: 'cancelado',
      assinafyStatus: 'failed',
      documentId: `doc-reconcile-${runId}`,
    });
  });
});
