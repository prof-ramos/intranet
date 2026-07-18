import { describe, expect, it, vi } from 'vitest';
import { handleWebhookEvent } from './service';
import type { AssinafyWebhookEvent } from './types';

const {
  mockCreateNotificationsBatch,
  mockFindOficioForUpdate,
  mockTransaction,
  mockTx,
  mockUpdateAssinafyStatus,
} = vi.hoisted(() => {
  const adminRows = Array.from({ length: 1_000 }, (_, index) => ({ id: index + 1 }));
  const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }]);
  const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockReturning }));
  const mockValues = vi.fn(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
  const mockTx = {
    insert: vi.fn(() => ({ values: mockValues })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(adminRows) })),
    })),
  };
  const mockTransaction = vi.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
    callback(mockTx),
  );

  return {
    mockCreateNotificationsBatch: vi.fn().mockResolvedValue([]),
    mockFindOficioForUpdate: vi.fn().mockResolvedValue({
      id: 1,
      createdBy: 1,
      number: 'OF-TEST-001',
      recipient: 'Synthetic recipient',
      year: 2026,
      sequence: 1,
      assinafyStatus: 'pending_signature',
      status: 'gerado',
    }),
    mockTransaction,
    mockTx,
    mockUpdateAssinafyStatus: vi.fn().mockResolvedValue({ id: 1 }),
  };
});

vi.mock('@/lib/db', () => ({ db: { transaction: mockTransaction } }));
vi.mock('@/lib/oficios/repository', () => ({
  findOfficialLetterByAssinafyDocumentIdForUpdate: mockFindOficioForUpdate,
}));
vi.mock('./repository', () => ({ updateAssinafyStatus: mockUpdateAssinafyStatus }));
vi.mock('@/lib/audit/service', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/integrations/outbox', () => ({ emitDomainEvent: vi.fn() }));
vi.mock('@/lib/notifications/repository', () => ({
  createNotificationsBatch: mockCreateNotificationsBatch,
}));

const BASE_EVENT: AssinafyWebhookEvent = {
  id: 1,
  event: 'signer_signed_document',
  message: null,
  payload: { signer_full_name: 'Synthetic signer' },
  origin: { ip: '127.0.0.1', 'user-agent': 'benchmark' },
  created_at: 1_705_312_200,
  subject: {
    id: 's1',
    full_name: 'Synthetic signer',
    email: 'synthetic@example.test',
    type: 'Signer',
  },
  object: { id: 'doc123', status: 'partially_signed', type: 'Document' },
  account_id: 'acc1',
};

describe('Performance benchmark for handleWebhookEvent', () => {
  it('measures creation of one notification batch with 1,000 recipients', async () => {
    const start = performance.now();
    const result = await handleWebhookEvent(BASE_EVENT);
    const duration = performance.now() - start;

    console.log(`Execution time for 1000 notifications: ${duration.toFixed(2)} ms`);
    expect(result).toEqual(expect.objectContaining({ status: 'processed', entityId: 1 }));
    expect(mockFindOficioForUpdate).toHaveBeenCalledWith('doc123', mockTx);
    expect(mockCreateNotificationsBatch).toHaveBeenCalledOnce();

    const [notifications, executor] = mockCreateNotificationsBatch.mock.calls[0] as [
      Array<{ userId: number }>,
      unknown,
    ];
    expect(notifications).toHaveLength(1_000);
    expect(new Set(notifications.map((notification) => notification.userId)).size).toBe(1_000);
    expect(executor).toBe(mockTx);
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});
