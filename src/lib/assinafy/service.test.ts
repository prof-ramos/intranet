import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleWebhookEvent } from './service';
import type { AssinafyWebhookEvent } from './types';

const {
  mockAdminRows,
  mockClaimRows,
  mockCreateNotificationsBatch,
  mockEmitDomainEvent,
  mockFindOficioForUpdate,
  mockInsert,
  mockLogAuditAction,
  mockLogger,
  mockReturning,
  mockTransaction,
  mockTx,
  mockUpdateAssinafyStatus,
  mockValues,
} = vi.hoisted(() => {
  const mockAdminRows = { current: [] as Array<{ id: number }> };
  const mockClaimRows = { current: [{ id: 99 }] as Array<{ id: number }> };
  const mockReturning = vi.fn(() => Promise.resolve(mockClaimRows.current));
  const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockReturning }));
  const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockWhere = vi.fn(() => Promise.resolve(mockAdminRows.current));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockTx = {
    insert: mockInsert,
    select: vi.fn(() => ({ from: mockFrom })),
  };
  const mockTransaction = vi.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
    callback(mockTx),
  );

  return {
    mockAdminRows,
    mockClaimRows,
    mockCreateNotificationsBatch: vi.fn(),
    mockEmitDomainEvent: vi.fn(),
    mockFindOficioForUpdate: vi.fn(),
    mockInsert,
    mockLogAuditAction: vi.fn(),
    mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    mockReturning,
    mockTransaction,
    mockTx,
    mockUpdateAssinafyStatus: vi.fn(),
    mockValues,
  };
});

vi.mock('@/lib/db', () => ({ db: { transaction: mockTransaction } }));

vi.mock('@/lib/oficios/repository', () => ({
  findOfficialLetterByAssinafyDocumentIdForUpdate: mockFindOficioForUpdate,
}));

vi.mock('./repository', () => ({ updateAssinafyStatus: mockUpdateAssinafyStatus }));

vi.mock('@/lib/audit/service', () => ({ logAuditAction: mockLogAuditAction }));
vi.mock('@/lib/integrations/outbox', () => ({ emitDomainEvent: mockEmitDomainEvent }));
vi.mock('@/lib/notifications/repository', () => ({
  createNotificationsBatch: mockCreateNotificationsBatch,
}));
vi.mock('@/lib/logger', () => ({ createLogger: () => mockLogger }));

const BASE_EVENT: AssinafyWebhookEvent = {
  id: 1,
  event: 'signer_signed_document',
  message: null,
  payload: { signer_full_name: 'Test signer' },
  origin: { ip: '127.0.0.1', 'user-agent': 'test' },
  created_at: 1_705_312_200,
  subject: { id: 's1', full_name: 'Test signer', email: 'test@example.test', type: 'Signer' },
  object: { id: 'doc123', status: 'partially_signed', type: 'Document' },
  account_id: 'acc1',
};

const MOCK_OFICIO = {
  id: 1,
  createdBy: 1,
  number: 'OF-TEST-001',
  recipient: 'Test recipient',
  year: 2026,
  sequence: 1,
  assinafyStatus: 'pending_signature',
  status: 'gerado',
};

describe('assinafy/service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminRows.current = [];
    mockClaimRows.current = [{ id: 99 }];
    mockFindOficioForUpdate.mockResolvedValue({ ...MOCK_OFICIO });
    mockUpdateAssinafyStatus.mockResolvedValue({ id: 1 });
    mockEmitDomainEvent.mockResolvedValue({ id: 10 });
    mockCreateNotificationsBatch.mockResolvedValue([]);
    mockLogAuditAction.mockResolvedValue(undefined);
  });

  it('claims the nonce first and commits all effects with the same transaction executor', async () => {
    mockAdminRows.current = [{ id: 5 }];

    const result = await handleWebhookEvent(BASE_EVENT);

    expect(result).toEqual({
      status: 'processed',
      entityId: 1,
      action: 'official_letter_status_changed',
      actorId: null,
      changedFields: ['assinafyStatus', 'assinafySignedAt'],
    });
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ keyId: 'assinafy', signature: '1', expiresAt: expect.any(Date) }),
    );
    expect(mockReturning).toHaveBeenCalledWith(expect.objectContaining({ id: expect.anything() }));
    expect(mockFindOficioForUpdate).toHaveBeenCalledWith('doc123', mockTx);
    expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
      1,
      'partially_signed',
      expect.objectContaining({ assinafySignedAt: expect.any(Date) }),
      mockTx,
    );
    expect(mockEmitDomainEvent).toHaveBeenCalledWith(expect.any(Object), mockTx);
    expect(mockCreateNotificationsBatch).toHaveBeenCalledWith(expect.any(Array), mockTx);
    expect(mockInsert.mock.invocationCallOrder[0]).toBeLessThan(
      mockFindOficioForUpdate.mock.invocationCallOrder[0],
    );
  });

  it('returns duplicate without domain reads or writes when the claim loses', async () => {
    mockClaimRows.current = [];

    await expect(handleWebhookEvent(BASE_EVENT)).resolves.toEqual({ status: 'duplicate' });

    expect(mockFindOficioForUpdate).not.toHaveBeenCalled();
    expect(mockUpdateAssinafyStatus).not.toHaveBeenCalled();
    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
    expect(mockCreateNotificationsBatch).not.toHaveBeenCalled();
    expect(mockLogAuditAction).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', '1', 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns invalid without opening a transaction for malformed event id %s',
    async (id) => {
      const malformed = { ...BASE_EVENT, id } as unknown as AssinafyWebhookEvent;

      await expect(handleWebhookEvent(malformed)).resolves.toEqual({ status: 'invalid' });

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    },
  );

  it('confirms the nonce and ignores an unknown event type', async () => {
    const event = { ...BASE_EVENT, event: 'unknown_event' };

    await expect(handleWebhookEvent(event)).resolves.toEqual({ status: 'ignored' });

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockFindOficioForUpdate).not.toHaveBeenCalled();
    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
  });

  it('rolls back the nonce and returns failed when the referenced Ofício is not found', async () => {
    mockFindOficioForUpdate.mockResolvedValue(null);

    await expect(handleWebhookEvent(BASE_EVENT)).resolves.toEqual({ status: 'failed' });

    expect(mockUpdateAssinafyStatus).not.toHaveBeenCalled();
    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
  });

  it('ignores a new event whose mapped status is already current', async () => {
    mockFindOficioForUpdate.mockResolvedValue({
      ...MOCK_OFICIO,
      assinafyStatus: 'partially_signed',
    });

    await expect(handleWebhookEvent(BASE_EVENT)).resolves.toEqual({ status: 'ignored' });
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockUpdateAssinafyStatus).not.toHaveBeenCalled();
    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
    expect(mockCreateNotificationsBatch).not.toHaveBeenCalled();
    expect(mockLogAuditAction).not.toHaveBeenCalled();
  });

  it.each([
    ['certificated', 'signer_signed_document'],
    ['certificated', 'document_signed'],
    ['rejected_by_signer', 'document_ready'],
    ['rejected_by_user', 'document_ready'],
    ['expired', 'document_ready'],
    ['failed', 'document_ready'],
  ] as const)('ignores stale %s -> %s callbacks without effects', async (current, eventName) => {
    mockAdminRows.current = [{ id: 5 }];
    mockFindOficioForUpdate.mockResolvedValue({ ...MOCK_OFICIO, assinafyStatus: current });

    await expect(handleWebhookEvent({ ...BASE_EVENT, event: eventName })).resolves.toEqual({
      status: 'ignored',
    });

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockUpdateAssinafyStatus).not.toHaveBeenCalled();
    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
    expect(mockCreateNotificationsBatch).not.toHaveBeenCalled();
    expect(mockLogAuditAction).not.toHaveBeenCalled();
  });

  it('allows a direct partially signed -> certificated provider jump', async () => {
    mockFindOficioForUpdate.mockResolvedValue({
      ...MOCK_OFICIO,
      assinafyStatus: 'partially_signed',
    });

    await expect(handleWebhookEvent({ ...BASE_EVENT, event: 'document_ready' })).resolves.toEqual(
      expect.objectContaining({ status: 'processed' }),
    );
    expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
      1,
      'certificated',
      expect.objectContaining({ assinafySignedAt: expect.any(Date) }),
      mockTx,
    );
  });

  it('persists document expiry as its terminal status', async () => {
    mockFindOficioForUpdate.mockResolvedValue({
      ...MOCK_OFICIO,
      assinafyStatus: 'pending_signature',
    });

    await expect(handleWebhookEvent({ ...BASE_EVENT, event: 'document_expired' })).resolves.toEqual(
      expect.objectContaining({ status: 'processed' }),
    );
    expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(1, 'expired', {}, mockTx);
  });

  it('returns failed when a transactional effect rejects and does not audit', async () => {
    mockAdminRows.current = [{ id: 5 }];
    mockCreateNotificationsBatch.mockRejectedValueOnce(new Error('sensitive database detail'));

    await expect(handleWebhookEvent(BASE_EVENT)).resolves.toEqual({ status: 'failed' });

    expect(mockLogAuditAction).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to process Assinafy webhook', {
      event: BASE_EVENT.event,
    });
    expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain('sensitive database detail');
    expect(JSON.stringify(mockLogger.error.mock.calls)).not.toContain(BASE_EVENT.object.id);
  });

  it('audits only after a processed transaction and never passes the transaction executor', async () => {
    const result = await handleWebhookEvent(BASE_EVENT);

    expect(result.status).toBe('processed');
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: null,
        action: 'official_letter_status_changed',
        entityType: 'official_letter',
        entityId: 1,
      }),
    );
    expect(mockLogAuditAction.mock.calls[0][0]).not.toHaveProperty('executor');
    expect(mockTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      mockLogAuditAction.mock.invocationCallOrder[0],
    );
  });

  it('keeps the processed result when best-effort audit rejects', async () => {
    mockLogAuditAction.mockRejectedValueOnce(new Error('audit unavailable'));

    await expect(handleWebhookEvent(BASE_EVENT)).resolves.toEqual(
      expect.objectContaining({ status: 'processed', entityId: 1 }),
    );
  });

  it('maps provider failure details to the transaction but exposes only changed field names', async () => {
    const event = {
      ...BASE_EVENT,
      event: 'document_processing_failed',
      payload: { error_message: 'provider detail' },
    };

    const result = await handleWebhookEvent(event);

    expect(mockUpdateAssinafyStatus).toHaveBeenCalledWith(
      1,
      'failed',
      { assinafyError: 'provider detail' },
      mockTx,
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'processed',
        changedFields: ['assinafyStatus', 'assinafyError'],
      }),
    );
    expect(JSON.stringify(result)).not.toContain('provider detail');
  });
});
