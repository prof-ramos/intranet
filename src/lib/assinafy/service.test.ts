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

describe('assinafy/service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOficioByAssinafyDocumentId.mockResolvedValue({ id: 1 });
    mockUpdateAssinafyStatus.mockResolvedValue({ id: 1 });
  });

  describe('handleWebhookEvent', () => {
    it('handles signer_signed_document', async () => {
      await handleWebhookEvent(BASE_EVENT);
      expect(mockFindOficioByAssinafyDocumentId).toHaveBeenCalledWith('doc123');
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({ assinafySignedAt: expect.any(Date) }),
      );
    });

    it('handles document_ready', async () => {
      const event = { ...BASE_EVENT, event: 'document_ready', object: { ...BASE_EVENT.object, status: 'certificated' } };
      await handleWebhookEvent(event);
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        'certificated',
        expect.objectContaining({ assinafySignedAt: expect.any(Date) }),
      );
    });

    it('handles signer_rejected_document', async () => {
      const event = { ...BASE_EVENT, event: 'signer_rejected_document', object: { ...BASE_EVENT.object, status: 'rejected_by_signer' } };
      await handleWebhookEvent(event);
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        'rejected_by_signer',
        expect.objectContaining({ assinafyError: expect.any(String) }),
      );
    });

    it('handles document_processing_failed', async () => {
      const event = { ...BASE_EVENT, event: 'document_processing_failed', payload: { error_message: 'PDF corrupt' }, object: { ...BASE_EVENT.object, status: 'failed' } };
      await handleWebhookEvent(event);
      expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
        1,
        'failed',
        expect.objectContaining({ assinafyError: 'PDF corrupt' }),
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
  });
});
