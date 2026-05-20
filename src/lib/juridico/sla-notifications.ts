import { db } from '@/lib/db';
import { legalConsultations } from '@/lib/db/schema';
import { and, asc, ne } from 'drizzle-orm';
import { isSlaDueSoonSql } from './sla';
import { emitSlaWarning } from '@/lib/events';
import { createLogger } from '@/lib/logger';

const logger = createLogger('juridico:sla-notifications');
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

interface SlaWarningCandidate {
  id: number;
  internalNumber: string;
  title: string;
  slaDueDate: Date | null;
  createdBy: number | null;
}

export interface CheckSlaWarningsOptions {
  limit?: number;
}

export interface SlaWarningFailure {
  consultationId: number;
  reason: string;
}

export interface SlaWarningRunResult {
  scanned: number;
  eligible: number;
  emitted: number;
  skipped: number;
  failed: number;
  limit: number;
  failures: SlaWarningFailure[];
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

function errorReason(reason: unknown) {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return 'Unknown error';
}

export async function checkAndEmitSlaWarnings(
  options: CheckSlaWarningsOptions = {},
): Promise<SlaWarningRunResult> {
  const limit = normalizeLimit(options.limit);
  const dueSoon = await db
    .select({
      id: legalConsultations.id,
      internalNumber: legalConsultations.internalNumber,
      title: legalConsultations.title,
      slaDueDate: legalConsultations.slaDueDate,
      createdBy: legalConsultations.createdBy,
    })
    .from(legalConsultations)
    .where(
      and(
        ne(legalConsultations.status, 'arquivada'),
        isSlaDueSoonSql(legalConsultations.slaDueDate),
      ),
    )
    .orderBy(asc(legalConsultations.slaDueDate), asc(legalConsultations.id))
    .limit(limit);

  const eligible = dueSoon.filter(
    (c): c is SlaWarningCandidate & { slaDueDate: Date; createdBy: number } =>
      c.slaDueDate !== null && c.createdBy !== null,
  );
  const skipped = dueSoon.length - eligible.length;

  const results = await Promise.allSettled(
    eligible.map((c) =>
      emitSlaWarning({
        consultationId: c.id,
        internalNumber: c.internalNumber,
        title: c.title,
        slaDueDate: c.slaDueDate.toISOString(),
        recipientId: c.createdBy,
      }),
    ),
  );

  const failures = results.reduce<SlaWarningFailure[]>((acc, result, index) => {
    if (result.status === 'rejected') {
      acc.push({
        consultationId: eligible[index].id,
        reason: errorReason(result.reason),
      });
    }
    return acc;
  }, []);

  const summary: SlaWarningRunResult = {
    scanned: dueSoon.length,
    eligible: eligible.length,
    emitted: results.length - failures.length,
    skipped,
    failed: failures.length,
    limit,
    failures,
  };

  if (failures.length > 0) {
    logger.error('[checkAndEmitSlaWarnings] failed to emit SLA warnings', {
      scanned: summary.scanned,
      eligible: summary.eligible,
      emitted: summary.emitted,
      skipped: summary.skipped,
      failed: summary.failed,
      failures,
    });
  } else {
    logger.info('[checkAndEmitSlaWarnings] completed SLA warning job', {
      scanned: summary.scanned,
      eligible: summary.eligible,
      emitted: summary.emitted,
      skipped: summary.skipped,
      failed: summary.failed,
      limit: summary.limit,
      failures: summary.failures,
    });
  }

  return summary;
}
