import { db, type DbExecutor } from '@/lib/db';
import { auditLogs, type NewAuditLog } from '@/lib/db/schema/audit';
import { sanitizePiiValue } from '@/lib/sanitize-pii';
import { createLogger, type Logger } from '@/lib/logger';

const logger = createLogger('audit');

export interface LogAuditOptions {
  adminId: number | null;
  action: string;
  entityType: NewAuditLog['entityType'];
  entityId?: number | null;
  changes?: NewAuditLog['changes'];
  metadata?: Record<string, unknown>;
  executor?: DbExecutor;
}

export async function logAuditAction(options: LogAuditOptions): Promise<void> {
  if (options.adminId !== null && (!Number.isInteger(options.adminId) || options.adminId <= 0)) {
    throw new Error('Invalid audit actor.');
  }

  try {
    await (options.executor ?? db).insert(auditLogs).values({
      performedBy: options.adminId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      changes: sanitizePiiValue(options.changes) as NewAuditLog['changes'],
      metadata: sanitizePiiValue(options.metadata) as NewAuditLog['metadata'],
    });
  } catch (error) {
    logger.error(
      '[AUDIT_FAILURE]',
      { adminId: options.adminId, action: options.action },
      error as Error,
    );
    // An explicit executor means the caller selected strict transactional
    // durability: an audit failure must abort the surrounding mutation.
    if (options.executor) {
      throw error;
    }
    // Standalone calls retain the historical best-effort contract.
  }
}

/**
 * Runs `logAuditAction` after a mutation's transaction has already committed.
 * This wrapper preserves best-effort behavior for callers that deliberately
 * audit after commit. Transactional callers should use `logAuditAction` with
 * an explicit executor instead.
 */
export async function logAuditBestEffort(
  auditArgs: LogAuditOptions,
  callerLogger: Logger = logger,
): Promise<void> {
  try {
    await logAuditAction(auditArgs);
  } catch {
    callerLogger.warn('Audit log failed after committed mutation', {
      action: auditArgs.action,
      entityType: auditArgs.entityType,
      entityId: auditArgs.entityId,
    });
  }
}

export type DataAccessAction = 'view' | 'export' | 'edit';

export interface LogDataAccessOptions {
  adminId: number;
  executor?: DbExecutor;
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
    executor: options.executor,
  });
}
