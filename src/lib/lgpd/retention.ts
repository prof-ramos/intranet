import { and, eq, isNotNull, lte, notExists, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, admins, associates, auditLogs, type NewAuditLog } from '@/lib/db/schema';
import { sanitizePiiValue } from '@/lib/sanitize-pii';

const MAX_RETENTION_QUERY_LIMIT = 100;
const RETENTION_YEARS = 5;
const REVIEW_SLA_DAYS = 15;
const TITLE_PREFIX = 'Revisar Retenção LGPD (Prazo Expirado) - ';

function yearsAgo(from: Date, years: number) {
  const date = new Date(from);
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function daysFrom(from: Date, days: number) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

export interface CheckLgpdRetentionActivitiesInput {
  limit: number;
  now?: Date;
}

export async function checkAndEmitLgpdRetentionActivities({
  limit,
  now = new Date(),
}: CheckLgpdRetentionActivitiesInput) {
  const validatedLimit = Math.min(Math.max(Math.floor(limit), 1), MAX_RETENTION_QUERY_LIMIT);

  return db.transaction(async (tx) => {
    // Use a real active admin as the actor because activities require createdBy.
    const [systemAdmin] = await tx
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.isActive, true))
      .orderBy(admins.id)
      .limit(1);

    if (!systemAdmin) {
      throw new Error('No active admin found to create LGPD activities');
    }

    const retentionCutoff = yearsAgo(now, RETENTION_YEARS);
    const retentionCutoffDate = retentionCutoff.toISOString().slice(0, 10);
    const dueDate = daysFrom(now, REVIEW_SLA_DAYS).toISOString();

    // ADR 006 forbids automatic erasure here. This watchdog only creates
    // PII-free review activities for former ASOF associates whose retention expired.
    const expiredAssociates = await tx
      .select({ id: associates.id })
      .from(associates)
      .where(
        and(
          eq(associates.associationStatus, 'nao_associado'),
          isNotNull(associates.cancellationDate),
          lte(associates.cancellationDate, retentionCutoffDate),
          notExists(
            tx
              .select({ id: activities.id })
              .from(activities)
              .where(
                and(
                  eq(activities.associateId, associates.id),
                  eq(activities.status, 'a_fazer'),
                  like(activities.title, `${TITLE_PREFIX}%`),
                ),
              ),
          ),
        ),
      )
      .limit(validatedLimit);

    if (expiredAssociates.length === 0) {
      await tx.insert(auditLogs).values({
        action: 'lgpd_retention_scan',
        entityType: 'activity',
        entityId: null,
        performedBy: systemAdmin.id,
        changes: null,
        metadata: sanitizePiiValue({
          actorType: 'system',
          retentionYears: RETENTION_YEARS,
          reviewSlaDays: REVIEW_SLA_DAYS,
          limit: validatedLimit,
          retentionCutoff: retentionCutoff.toISOString(),
          candidatesFound: 0,
          activitiesCreated: 0,
        }) as NewAuditLog['metadata'],
      });
      return { createdCount: 0 };
    }

    const newActivities = expiredAssociates.map((associate) => ({
      title: `${TITLE_PREFIX}Oficial ID ${associate.id}`,
      description:
        `Prazo de guarda (${RETENTION_YEARS} anos desde o cancelamento associativo) do oficial ID ${associate.id} expirou. ` +
        'Aprovar anonimização? Revise de acordo com o Estatuto da ASOF e registre eventual recusa com fundamento na LGPD Art. 16, I/IV ou Art. 18 §5º.',
      status: 'a_fazer' as const,
      priority: 'alta' as const,
      associateId: associate.id,
      createdBy: systemAdmin.id,
      tags: ['LGPD', 'Retenção'],
      dueDate,
    }));

    const inserted = await tx
      .insert(activities)
      .values(newActivities)
      .returning({ id: activities.id });

    await tx.insert(auditLogs).values({
      action: 'lgpd_retention_scan',
      entityType: 'activity',
      entityId: null,
      performedBy: systemAdmin.id,
      changes: null,
      metadata: sanitizePiiValue({
        actorType: 'system',
        retentionYears: RETENTION_YEARS,
        reviewSlaDays: REVIEW_SLA_DAYS,
        limit: validatedLimit,
        retentionCutoff: retentionCutoff.toISOString(),
        candidatesFound: expiredAssociates.length,
        activitiesCreated: inserted.length,
        activityIds: inserted.map((activity) => activity.id),
      }) as NewAuditLog['metadata'],
    });

    return { createdCount: inserted.length };
  });
}
