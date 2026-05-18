import { db } from '@/lib/db';
import { auditLogs, type NewAuditLog } from '@/lib/db/schema/audit';
import { sanitizePiiValue } from '@/lib/sanitize-pii';
import { createLogger } from '@/lib/logger';

const logger = createLogger('audit');

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
    logger.error('[AUDIT_FAILURE]', { adminId: options.adminId, action: options.action }, error as Error);
    // Não propaga o erro para não bloquear a operação principal
  }
}

export type DataAccessAction = 'view' | 'export' | 'edit';

export interface LogDataAccessOptions {
  adminId: number;
  action: DataAccessAction;
  entityType: NewAuditLog['entityType'];
  entityId?: number | null;
  metadata?: Record<string, unknown>;
}

/**
 * Convenience function for LGPD Art. 30/37 data access logging.
 * Wraps `logAuditAction` with a typed action namespace (`data_view`, `data_export`, `data_edit`).
 */
export async function logDataAccess(options: LogDataAccessOptions): Promise<void> {
  const actionPrefix: Record<DataAccessAction, string> = {
    view: 'data_view',
    export: 'data_export',
    edit: 'data_edit',
  };

  return logAuditAction({
    adminId: options.adminId,
    action: actionPrefix[options.action],
    entityType: options.entityType,
    entityId: options.entityId,
    metadata: options.metadata,
  });
}
