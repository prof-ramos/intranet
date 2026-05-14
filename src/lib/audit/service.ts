import { db } from '@/lib/db';
import { auditLogs, type NewAuditLog } from '@/lib/db/schema/audit';
import { sanitizePiiValue } from '@/lib/sanitize-pii';

export interface LogAuditOptions {
  adminId: number;
  action: string;
  entityType: NewAuditLog['entityType'];
  entityId?: number | null;
  changes?: NewAuditLog['changes'];
  metadata?: Record<string, unknown>;
}

export async function logAuditAction(options: LogAuditOptions): Promise<void> {
  if (!Number.isInteger(options.adminId) || options.adminId <= 0) {
    throw new Error('Invalid audit actor.');
  }

  try {
    await db.insert(auditLogs).values({
      performedBy: options.adminId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      changes: sanitizePiiValue(options.changes) as NewAuditLog['changes'],
      metadata: sanitizePiiValue(options.metadata) as NewAuditLog['metadata'],
    });
  } catch (error) {
    console.error('[AUDIT_FAILURE]', {
      adminId: options.adminId,
      action: options.action,
      error,
    });
    // Não propaga o erro para não bloquear a operação principal
  }
}
