import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  admins,
  auditLogs,
  domainEvents,
  integrationSignatureNonces,
  notifications,
  oficios,
} from '@/lib/db/schema';
import { handleWebhookEvent } from './service';
import type { AssinafyWebhookEvent } from './types';

const hasTestEnv = existsSync(resolve(process.cwd(), '.env.test.local'));
const runId = `${Date.now()}-${process.pid}`;
let fixtureCounter = 0;
let eventCounter = (Date.now() % 100_000_000) * 10;
let adminId = 0;
const createdOficioIds: number[] = [];
const usedEventIds: number[] = [];

function nextEventId() {
  eventCounter += 1;
  usedEventIds.push(eventCounter);
  return eventCounter;
}

function makeEvent(
  documentId: string,
  event = 'signer_signed_document',
  id = nextEventId(),
): AssinafyWebhookEvent {
  return {
    id,
    event,
    message: null,
    payload: {},
    origin: { ip: '127.0.0.1', 'user-agent': 'integration-test' },
    created_at: Math.floor(Date.now() / 1000),
    subject: {
      id: `subject-${runId}`,
      full_name: 'Synthetic signer',
      email: `synthetic-${runId}@example.test`,
      type: 'Signer',
    },
    object: { id: documentId, status: 'partially_signed', type: 'Document' },
    account_id: `account-${runId}`,
  };
}

async function createOficio(initialStatus: typeof oficios.$inferInsert.assinafyStatus = null) {
  fixtureCounter += 1;
  const documentId = `assinafy-integration-${runId}-${fixtureCounter}`;
  const sequence = (Date.now() % 1_000_000) * 10 + fixtureCounter;
  const [oficio] = await db
    .insert(oficios)
    .values({
      number: `OF-ASSINAFY-INT-${runId}-${fixtureCounter}`,
      year: 2099,
      sequence,
      recipient: 'Synthetic recipient',
      recipientRole: 'Synthetic role',
      vocativo: 'Senhor',
      letterDate: '1 de janeiro de 2099',
      subject: 'Synthetic integration fixture',
      itamaratySector: 'TEST',
      signatoryName: 'Synthetic signatory',
      signatoryRole: 'Synthetic role',
      bodyRichText: '<p>Synthetic body</p>',
      bodyPlainText: 'Synthetic body',
      createdBy: adminId,
      assinafyDocumentId: documentId,
      assinafyStatus: initialStatus,
    })
    .returning({ id: oficios.id });

  createdOficioIds.push(oficio.id);
  return { id: oficio.id, documentId };
}

async function countBlockedAppQueries(sqlClient: ReturnType<typeof postgres>) {
  const [row] = await sqlClient<{ count: number }[]>`
    select count(*)::int as count
      from pg_stat_activity
     where application_name = 'asof-intranet'
       and wait_event_type = 'Lock'
       and (
         query ilike '%oficios%'
         or query ilike '%integration_signature_nonces%'
         or query ilike '%notifications%'
       )
  `;
  return row.count;
}

async function waitForBlockedAppQueries(sqlClient: ReturnType<typeof postgres>, minimum: number) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if ((await countBlockedAppQueries(sqlClient)) >= minimum) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error(`Timed out waiting for ${minimum} blocked Assinafy queries.`);
}

function deferred() {
  let resolvePromise!: () => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<void>((resolveDeferred, rejectDeferred) => {
    resolvePromise = resolveDeferred;
    rejectPromise = rejectDeferred;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function holdOficioRowLock(sqlClient: ReturnType<typeof postgres>, oficioId: number) {
  const ready = deferred();
  const release = deferred();
  const done = sqlClient
    .begin(async (transaction) => {
      await transaction`select id from oficios where id = ${oficioId} for update`;
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

async function holdAdminTableStable(sqlClient: ReturnType<typeof postgres>) {
  const ready = deferred();
  const release = deferred();
  const done = sqlClient
    .begin(async (transaction) => {
      // Other integration files create and delete admins concurrently. Holding
      // SHARE keeps that recipient set stable while the service inserts its
      // FK-backed notification batch; notification inserts remain compatible.
      await transaction`lock table admins in share mode`;
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

async function holdAdminTableWithPendingDelete(
  sqlClient: ReturnType<typeof postgres>,
  adminToDelete: number,
) {
  const ready = deferred();
  const release = deferred();
  const done = sqlClient
    .begin(async (transaction) => {
      await transaction`lock table admins in share mode`;
      await transaction`delete from admins where id = ${adminToDelete}`;
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

async function withStableAdmins<T>(
  sqlClient: ReturnType<typeof postgres>,
  oficioId: number,
  callback: () => Promise<T>,
) {
  const stableAdmins = await holdAdminTableStable(sqlClient);
  try {
    return await callback();
  } finally {
    try {
      // Remove notifications before allowing other integration files to delete
      // the temporary admins that received them.
      await db
        .delete(notifications)
        .where(and(eq(notifications.entityType, 'oficio'), eq(notifications.entityId, oficioId)));
    } finally {
      await stableAdmins.release();
    }
  }
}

describe.skipIf(!hasTestEnv)('assinafy service integration (real PG)', () => {
  let barrierSql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required for Assinafy integration tests.');

    barrierSql = postgres(databaseUrl, {
      max: 4,
      connection: { application_name: 'assinafy-integration-barrier' },
    });

    const [admin] = await db
      .insert(admins)
      .values({
        name: 'Synthetic Assinafy Admin',
        email: `assinafy-integration-${runId}@example.test`,
        passwordHash: 'synthetic-not-a-real-password-hash',
        role: 'admin',
      })
      .returning({ id: admins.id });
    adminId = admin.id;
  });

  afterEach(async () => {
    if (createdOficioIds.length > 0) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.entityType, 'oficio'),
            inArray(notifications.entityId, createdOficioIds),
          ),
        );
      await db
        .delete(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'official_letter'),
            inArray(auditLogs.entityId, createdOficioIds),
          ),
        );
      await db
        .delete(domainEvents)
        .where(
          and(
            eq(domainEvents.entityType, 'official_letter'),
            inArray(domainEvents.entityId, createdOficioIds),
          ),
        );
      await db.delete(oficios).where(inArray(oficios.id, createdOficioIds));
      createdOficioIds.length = 0;
    }
    if (usedEventIds.length > 0) {
      await db.delete(integrationSignatureNonces).where(
        and(
          eq(integrationSignatureNonces.keyId, 'assinafy'),
          inArray(
            integrationSignatureNonces.signature,
            usedEventIds.map((id) => String(id)),
          ),
        ),
      );
      usedEventIds.length = 0;
    }
  });

  afterAll(async () => {
    if (adminId > 0) await db.delete(admins).where(eq(admins.id, adminId));
    if (barrierSql) await barrierSql.end();
  });

  it('commits status, one nonce and exactly one domain event', async () => {
    const fixture = await createOficio('pending_signature');
    const event = makeEvent(fixture.documentId);

    await withStableAdmins(barrierSql, fixture.id, async () => {
      await expect(handleWebhookEvent(event)).resolves.toEqual(
        expect.objectContaining({ status: 'processed', entityId: fixture.id }),
      );

      const [stored] = await db
        .select({ assinafyStatus: oficios.assinafyStatus })
        .from(oficios)
        .where(eq(oficios.id, fixture.id));
      const events = await db
        .select({ id: domainEvents.id })
        .from(domainEvents)
        .where(
          and(
            eq(domainEvents.entityType, 'official_letter'),
            eq(domainEvents.entityId, fixture.id),
          ),
        );
      const nonces = await db
        .select({ id: integrationSignatureNonces.id })
        .from(integrationSignatureNonces)
        .where(eq(integrationSignatureNonces.signature, String(event.id)));

      expect(stored.assinafyStatus).toBe('partially_signed');
      expect(events).toHaveLength(1);
      expect(nonces).toHaveLength(1);
    });
  });

  it('serializes concurrent delivery of the same event ID with a PostgreSQL row-lock barrier', async () => {
    const fixture = await createOficio('pending_signature');
    const event = makeEvent(fixture.documentId);
    await withStableAdmins(barrierSql, fixture.id, async () => {
      const baselineBlocked = await countBlockedAppQueries(barrierSql);
      const barrier = await holdOficioRowLock(barrierSql, fixture.id);

      const first = handleWebhookEvent(event);
      await waitForBlockedAppQueries(barrierSql, baselineBlocked + 1);
      const second = handleWebhookEvent(event);
      await waitForBlockedAppQueries(barrierSql, baselineBlocked + 2);
      await barrier.release();

      const results = await Promise.all([first, second]);
      expect(results.map((result) => result.status).sort()).toEqual(['duplicate', 'processed']);

      const events = await db
        .select({ id: domainEvents.id })
        .from(domainEvents)
        .where(
          and(
            eq(domainEvents.entityType, 'official_letter'),
            eq(domainEvents.entityId, fixture.id),
          ),
        );
      const nonces = await db
        .select({ id: integrationSignatureNonces.id })
        .from(integrationSignatureNonces)
        .where(eq(integrationSignatureNonces.signature, String(event.id)));
      expect(events).toHaveLength(1);
      expect(nonces).toHaveLength(1);
    });
  });

  it('row-locks one Ofício across distinct event IDs and preserves the serialized previous status', async () => {
    const fixture = await createOficio('pending_signature');
    const firstEvent = makeEvent(fixture.documentId, 'signer_signed_document');
    const secondEvent = makeEvent(fixture.documentId, 'document_ready');
    await withStableAdmins(barrierSql, fixture.id, async () => {
      const baselineBlocked = await countBlockedAppQueries(barrierSql);
      const barrier = await holdOficioRowLock(barrierSql, fixture.id);

      const first = handleWebhookEvent(firstEvent);
      await waitForBlockedAppQueries(barrierSql, baselineBlocked + 1);
      const second = handleWebhookEvent(secondEvent);
      await waitForBlockedAppQueries(barrierSql, baselineBlocked + 2);
      await barrier.release();

      const results = await Promise.all([first, second]);
      const resultStatuses = results.map((result) => result.status);
      expect(resultStatuses).toContain('processed');
      expect(resultStatuses.every((status) => status === 'processed' || status === 'ignored')).toBe(
        true,
      );

      const events = await db
        .select({ payload: domainEvents.payload })
        .from(domainEvents)
        .where(
          and(
            eq(domainEvents.entityType, 'official_letter'),
            eq(domainEvents.entityId, fixture.id),
          ),
        )
        .orderBy(asc(domainEvents.id));
      const [stored] = await db
        .select({ assinafyStatus: oficios.assinafyStatus })
        .from(oficios)
        .where(eq(oficios.id, fixture.id));
      const nonces = await db
        .select({ signature: integrationSignatureNonces.signature })
        .from(integrationSignatureNonces)
        .where(
          inArray(integrationSignatureNonces.signature, [
            String(firstEvent.id),
            String(secondEvent.id),
          ]),
        );
      const emittedStatuses = events.map((event) => (event.payload as { status: string }).status);

      expect(stored.assinafyStatus).toBe('certificated');
      expect(nonces).toHaveLength(2);
      expect([['certificated'], ['partially_signed', 'certificated']]).toContainEqual(
        emittedStatuses,
      );

      const notificationRows = await db
        .select({ dedupeKey: notifications.dedupeKey })
        .from(notifications)
        .where(and(eq(notifications.entityType, 'oficio'), eq(notifications.entityId, fixture.id)));
      const notifiedStatuses = new Set(
        notificationRows.map((notification) => notification.dedupeKey?.split(':').at(-1)),
      );
      expect(notifiedStatuses).toEqual(new Set(emittedStatuses));
    });
  });

  it('keeps a certificated document monotonic when a distinct late signer event arrives', async () => {
    const fixture = await createOficio('pending_signature');
    const readyEvent = makeEvent(fixture.documentId, 'document_ready');
    const lateSignerEvent = makeEvent(fixture.documentId, 'signer_signed_document');

    await withStableAdmins(barrierSql, fixture.id, async () => {
      await expect(handleWebhookEvent(readyEvent)).resolves.toEqual(
        expect.objectContaining({ status: 'processed' }),
      );
      await expect(handleWebhookEvent(lateSignerEvent)).resolves.toEqual({ status: 'ignored' });

      const [stored] = await db
        .select({ assinafyStatus: oficios.assinafyStatus })
        .from(oficios)
        .where(eq(oficios.id, fixture.id));
      const events = await db
        .select({ payload: domainEvents.payload })
        .from(domainEvents)
        .where(
          and(
            eq(domainEvents.entityType, 'official_letter'),
            eq(domainEvents.entityId, fixture.id),
          ),
        )
        .orderBy(asc(domainEvents.id));
      const nonces = await db
        .select({ signature: integrationSignatureNonces.signature })
        .from(integrationSignatureNonces)
        .where(
          inArray(integrationSignatureNonces.signature, [
            String(readyEvent.id),
            String(lateSignerEvent.id),
          ]),
        );

      expect(stored.assinafyStatus).toBe('certificated');
      expect(events.map((event) => (event.payload as { status: string }).status)).toEqual([
        'certificated',
      ]);
      expect(nonces).toHaveLength(2);
    });
  });

  it('rolls back nonce and all effects on a real FK violation, then retries successfully', async () => {
    const fixture = await createOficio('pending_signature');
    const event = makeEvent(fixture.documentId);
    const [conflictingAdmin] = await db
      .insert(admins)
      .values({
        name: 'Synthetic transient admin',
        email: `assinafy-conflict-${runId}@example.test`,
        passwordHash: 'synthetic-not-a-real-password-hash',
        role: 'admin',
      })
      .returning({ id: admins.id });

    const deletingAdmin = await holdAdminTableWithPendingDelete(barrierSql, conflictingAdmin.id);

    const baselineBlocked = await countBlockedAppQueries(barrierSql);
    const failedAttempt = handleWebhookEvent(event);
    await waitForBlockedAppQueries(barrierSql, baselineBlocked + 1);
    await deletingAdmin.release();

    await expect(failedAttempt).resolves.toEqual({ status: 'failed' });

    const [rolledBackOficio] = await db
      .select({ assinafyStatus: oficios.assinafyStatus })
      .from(oficios)
      .where(eq(oficios.id, fixture.id));
    const rolledBackEvents = await db
      .select({ id: domainEvents.id })
      .from(domainEvents)
      .where(
        and(eq(domainEvents.entityType, 'official_letter'), eq(domainEvents.entityId, fixture.id)),
      );
    const rolledBackNonces = await db
      .select({ id: integrationSignatureNonces.id })
      .from(integrationSignatureNonces)
      .where(eq(integrationSignatureNonces.signature, String(event.id)));
    const rolledBackNotifications = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.entityType, 'oficio'), eq(notifications.entityId, fixture.id)));

    expect(rolledBackOficio.assinafyStatus).toBe('pending_signature');
    expect(rolledBackEvents).toHaveLength(0);
    expect(rolledBackNonces).toHaveLength(0);
    expect(rolledBackNotifications).toHaveLength(0);

    await withStableAdmins(barrierSql, fixture.id, async () => {
      await expect(handleWebhookEvent(event)).resolves.toEqual(
        expect.objectContaining({ status: 'processed', entityId: fixture.id }),
      );
    });
  });

  it('confirms the nonce for an unknown event and returns ignored without effects', async () => {
    const fixture = await createOficio('pending_signature');
    const event = makeEvent(fixture.documentId, 'unknown_event');

    await expect(handleWebhookEvent(event)).resolves.toEqual({ status: 'ignored' });

    const events = await db
      .select({ id: domainEvents.id })
      .from(domainEvents)
      .where(
        and(eq(domainEvents.entityType, 'official_letter'), eq(domainEvents.entityId, fixture.id)),
      );
    const nonces = await db
      .select({ id: integrationSignatureNonces.id })
      .from(integrationSignatureNonces)
      .where(eq(integrationSignatureNonces.signature, String(event.id)));
    expect(events).toHaveLength(0);
    expect(nonces).toHaveLength(1);
  });

  it('rolls back the nonce and returns failed when the referenced Oficio is not found', async () => {
    const event = makeEvent('non-existent-doc-id');

    await expect(handleWebhookEvent(event)).resolves.toEqual({ status: 'failed' });

    const nonces = await db
      .select({ id: integrationSignatureNonces.id })
      .from(integrationSignatureNonces)
      .where(eq(integrationSignatureNonces.signature, String(event.id)));
    expect(nonces).toHaveLength(0);
  });
});
