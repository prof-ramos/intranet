import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleWebhookEvent } from './service';
import type { AssinafyWebhookEvent } from './types';

const { mockUpdateAssinafyStatus, mockFindOficioByAssinafyDocumentId, mockAdminQueryResult } =
  vi.hoisted(() => ({
    mockUpdateAssinafyStatus: vi.fn(),
    mockFindOficioByAssinafyDocumentId: vi.fn(),
    mockAdminQueryResult: { current: [] as Array<{ id: number }> },
  }));

vi.mock('./repository', () => ({
  findOficioByAssinafyDocumentId: mockFindOficioByAssinafyDocumentId,
  updateAssinafyStatus: mockUpdateAssinafyStatus,
}));

vi.mock('@/lib/db', () => {
  // Chainable mock for Drizzle's query builder inside transactions.
  // Supports select().from().where() and insert().values().onConflictDoNothing().returning().
  const thenable = { then: (resolve: (val: unknown) => void) => resolve([]) };

  const queryBuilder: Record<string, unknown> = {
    orderBy: () => ({
      ...thenable,
      limit: () => Promise.resolve([]),
    }),
  };
  (queryBuilder as Record<string, unknown>).then = (resolve: (val: unknown) => void) =>
    resolve(mockAdminQueryResult.current);

  const mockTx = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === 'then') return undefined;
      return () => {
        if (prop === 'where') return queryBuilder;
        if (prop === 'limit') return Promise.resolve([]);
        if (prop === 'returning') return Promise.resolve([]);
        return mockTx;
      };
    },
  });

  return {
    db: {
      transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
    },
  };
});

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn(),
}));

vi.mock('@/lib/notifications/repository', () => ({
  createNotification: vi.fn(),
  createNotificationsBatch: vi.fn(),
}));

const BASE_EVENT: AssinafyWebhookEvent = {
  id: 1,
  event: 'signer_signed_document',
  message: null,
  payload: { signer_full_name: 'João' },
  origin: { ip: '127.0.0.1', 'user-agent': 'Mozilla/5.0' },
  created_at: 1705312200,
  subject: { id: 's1', full_name: 'João', email: 'j@x.com', type: 'Signer' },
  object: { id: 'doc123', status: 'partially_signed', type: 'Document' },
  account_id: 'acc1',
};

const mockOficio = {
  id: 1,
  createdBy: 1,
  number: 'Ofício nº 001/2026-ASOF',
  year: 2026,
  sequence: 1,
  assinafyStatus: null,
  status: 'gerado',
};

describe('assinafy/service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminQueryResult.current = [];
    mockFindOficioByAssinafyDocumentId.mockResolvedValue({ ...mockOficio });
    mockUpdateAssinafyStatus.mockResolvedValue({ id: 1 });
  });

  describe('handleWebhookEvent', () => {
    it('handles signer_signed_document', async () => {
      await handleWebhookEvent(BASE_EVENT);
      expect(mockFindOficioByAssinafyDocumentId).toHaveBeenCalledWith('doc123', expect.anything());
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        'partially_signed',
        expect.objectContaining({ assinafySignedAt: expect.any(Date) }),
        expect.anything(),
      );
    });

    it('handles document_ready', async () => {
      const event = { ...BASE_EVENT, event: 'document_ready', object: { ...BASE_EVENT.object, status: 'certificated' } };
      await handleWebhookEvent(event);
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        'certificated',
        expect.objectContaining({ assinafySignedAt: expect.any(Date) }),
        expect.anything(),
      );
    });

    it('handles signer_rejected_document', async () => {
      const event = { ...BASE_EVENT, event: 'signer_rejected_document', object: { ...BASE_EVENT.object, status: 'rejected_by_signer' } };
      await handleWebhookEvent(event);
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        'rejected_by_signer',
        expect.objectContaining({ assinafyError: expect.any(String) }),
        expect.anything(),
      );
    });

    it('handles document_processing_failed', async () => {
      const event = { ...BASE_EVENT, event: 'document_processing_failed', payload: { error_message: 'PDF corrupt' }, object: { ...BASE_EVENT.object, status: 'failed' } };
      await handleWebhookEvent(event);
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        'failed',
        expect.objectContaining({ assinafyError: 'PDF corrupt' }),
        expect.anything(),
      );
    });

    it('returns null when ofício not found', async () => {
      mockFindOficioByAssinafyDocumentId.mockResolvedValue(null);
      const result = await handleWebhookEvent(BASE_EVENT);
      expect(result).toBeNull();
      expect(mockUpdateAssinafyStatus).not.toHaveBeenCalled();
    });

    it('handles unknown event gracefully', async () => {
      const event = { ...BASE_EVENT, event: 'unknown_event' };
      const result = await handleWebhookEvent(event);
      expect(result).toBeNull();
    });

    it('emits domain event on status change', async () => {
      const { emitDomainEvent } = await import('@/lib/integrations/outbox');
      await handleWebhookEvent(BASE_EVENT);
      expect(emitDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'official_letter.status_changed',
          entityType: 'official_letter',
          entityId: 1,
          payload: expect.objectContaining({ status: 'partially_signed' }),
        }),
        expect.anything(),
      );
    });

    it('logs audit action on status change', async () => {
      const { logAuditAction } = await import('@/lib/audit/service');
      await handleWebhookEvent(BASE_EVENT);
      expect(logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: null,
          action: 'official_letter_status_changed',
          entityType: 'official_letter',
          entityId: 1,
        }),
      );
    });

    it('does not pass executor to logAuditAction (audit is best-effort, outside tx)', async () => {
      const { logAuditAction } = await import('@/lib/audit/service');
      await handleWebhookEvent(BASE_EVENT);
      expect(logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'official_letter_status_changed',
          entityType: 'official_letter',
          entityId: 1,
        }),
      );
      const auditCall = vi.mocked(logAuditAction).mock.calls.at(-1)![0];
      expect(auditCall.executor).toBeUndefined();
    });

    it('skips update when status is already the mapped value (idempotency)', async () => {
      mockFindOficioByAssinafyDocumentId.mockResolvedValue({
        ...mockOficio,
        assinafyStatus: 'partially_signed',
      });
      const result = await handleWebhookEvent(BASE_EVENT);
      expect(mockUpdateAssinafyStatus).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it('returns transaction result when audit log fails (no false-negative)', async () => {
      const { logAuditAction } = await import('@/lib/audit/service');
      vi.mocked(logAuditAction).mockRejectedValueOnce(new Error('Audit DB unavailable'));
      const result = await handleWebhookEvent(BASE_EVENT);
      expect(mockUpdateAssinafyStatus).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it('creates notifications for all active admins', async () => {
      const { createNotificationsBatch } = await import('@/lib/notifications/repository');
      mockAdminQueryResult.current = [{ id: 5 }, { id: 7 }];

      await handleWebhookEvent(BASE_EVENT);

      expect(createNotificationsBatch).toHaveBeenCalledTimes(1);
      expect(createNotificationsBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 5,
            actorId: null,
            type: 'oficio.status_changed',
            title: 'Status do ofício alterado',
            dedupeKey: 'oficio.status_changed:1:partially_signed',
            entityType: 'oficio',
            entityId: 1,
          }),
          expect.objectContaining({
            userId: 7,
            actorId: null,
            dedupeKey: 'oficio.status_changed:1:partially_signed',
          }),
        ]),
        expect.anything(),
      );
    });

    it('includes dedupeKey in notification to prevent duplicates', async () => {
      const { createNotificationsBatch } = await import('@/lib/notifications/repository');
      mockAdminQueryResult.current = [{ id: 5 }];

      await handleWebhookEvent(BASE_EVENT);

      expect(createNotificationsBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            dedupeKey: 'oficio.status_changed:1:partially_signed',
          })
        ]),
        expect.anything(),
      );
    });

    it('returns null when transaction fails (e.g. notification creation error)', async () => {
      const { createNotificationsBatch } = await import('@/lib/notifications/repository');
      mockAdminQueryResult.current = [{ id: 5 }];
      vi.mocked(createNotificationsBatch).mockRejectedValueOnce(new Error('DB insert failed'));

      const result = await handleWebhookEvent(BASE_EVENT);

      // Transaction rejection is caught by outer try/catch
      expect(result).toBeNull();
    });
  });
});
