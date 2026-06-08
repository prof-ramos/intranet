import { describe, expect, it, vi, beforeEach } from 'vitest';
import { handleWebhookEvent } from './service';
import type { AssinafyWebhookEvent } from './types';

const { mockUpdateAssinafyStatus, mockFindOficioByAssinafyDocumentId } = vi.hoisted(() => ({
  mockUpdateAssinafyStatus: vi.fn(),
  mockFindOficioByAssinafyDocumentId: vi.fn(),
}));

vi.mock('./repository', () => ({
  findOficioByAssinafyDocumentId: mockFindOficioByAssinafyDocumentId,
  updateAssinafyStatus: mockUpdateAssinafyStatus,
}));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb({})),
  },
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn(),
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
    mockFindOficioByAssinafyDocumentId.mockResolvedValue({ ...mockOficio });
    mockUpdateAssinafyStatus.mockResolvedValue({ id: 1 });
  });

  describe('handleWebhookEvent', () => {
    it('handles signer_signed_document', async () => {
      await handleWebhookEvent(BASE_EVENT);
      expect(mockFindOficioByAssinafyDocumentId).toHaveBeenCalledWith('doc123');
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
          adminId: 1,
          action: 'official_letter_status_changed',
          entityType: 'official_letter',
          entityId: 1,
        }),
      );
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
  });
});
