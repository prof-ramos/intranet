/**
 * Notification dispatcher for email triage.
 *
 * Extracted from pipeline.ts (US-003) to separate notification logic from
 * orchestration. Returns structured results instead of throwing.
 */
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resolveSystemBotUser } from '@/lib/system-users';
import { createNotificationFromEvent } from '@/lib/notifications/service';
import type { EmailPayload, EmailTriageResult } from './schema';
import { createLogger } from '@/lib/logger';
import type { DbExecutor } from '@/lib/db';

const log = createLogger('email-triage:notifier');

export interface NotifyResult {
  ok: boolean;
  error?: string;
}

export async function notifyNeedsValidation(
  triageResult: EmailTriageResult,
  triageId: number,
  payload: EmailPayload,
  tx?: DbExecutor,
): Promise<NotifyResult> {
  try {
    const actorId = await resolveSystemBotUser();

    const executor = tx ?? db;
    const adminUsers = await executor
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.role, 'admin'));

    const results = await Promise.allSettled(
      adminUsers.map((admin) =>
        createNotificationFromEvent('email_triage_pending', {
          recipientId: admin.id,
          actorId,
          title: 'Nova triagem aguardando revisão operacional',
          message: `E-mail "${payload.subject}" de ${payload.sender} foi classificado como ${triageResult.categoria} (risco ${triageResult.nivel_risco}) e exige revisão operacional.`,
          href: `/app/email-triage/${triageId}`,
          entityType: 'email_triagem',
          entityId: triageId,
        }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      log.warn(`${failed.length} triage notifications failed (non-fatal).`);
    }

    return { ok: true };
  } catch (nErr) {
    const error = nErr instanceof Error ? nErr.message : String(nErr);
    log.warn('Failed to notify admins of new triage (non-fatal).', { error });
    return { ok: false, error };
  }
}
