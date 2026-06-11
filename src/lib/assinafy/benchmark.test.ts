import { describe, it, vi, expect } from 'vitest';
import { handleWebhookEvent } from './service';
import type { AssinafyWebhookEvent } from './types';

const mockAdminQueryResult = { current: Array.from({ length: 1000 }, (_, i) => ({ id: i })) };

vi.mock('./repository', () => ({
  findOficioByAssinafyDocumentId: vi.fn().mockResolvedValue({
    id: 1,
    createdBy: 1,
    number: 'Ofício nº 001/2026-ASOF',
    year: 2026,
    sequence: 1,
    assinafyStatus: null,
    status: 'gerado',
  }),
  updateAssinafyStatus: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock('@/lib/db', () => {
  const thenable = { then: (resolve: (val: unknown) => void) => resolve([]) };
  const queryBuilder: Record<string, unknown> = {
    orderBy: () => ({ ...thenable, limit: () => Promise.resolve([]) }),
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

vi.mock('@/lib/audit/service', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/integrations/outbox', () => ({ emitDomainEvent: vi.fn() }));
vi.mock('@/lib/notifications/repository', () => ({
  createNotification: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1))),
  createNotificationsBatch: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1))),
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

describe('Performance benchmark for handleWebhookEvent', () => {
  it('measures time to handle notifications', async () => {
    const start = Date.now();
    await handleWebhookEvent(BASE_EVENT);
    const end = Date.now();
    const duration = end - start;
    console.log(`Execution time for 1000 notifications: ${duration} ms`);
    expect(duration).toBeDefined();
  });
});
