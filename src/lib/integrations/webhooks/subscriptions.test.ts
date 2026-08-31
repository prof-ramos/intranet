import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createManagedWebhookSubscription,
  rotateManagedWebhookSubscriptionSecret,
  setManagedWebhookSubscriptionActive,
  updateManagedWebhookSubscription,
} from '@/lib/integrations/webhooks/subscriptions';

const mockInsertWebhookSubscription = vi.fn();
const mockUpdateWebhookSubscriptionById = vi.fn();
const mockGetWebhookSubscriptionById = vi.fn();
const mockEncryptWebhookSecret = vi.fn();
const mockTransaction = vi.fn();
const auditValues = vi.fn();
const tx = {
  insert: vi.fn(() => ({ values: auditValues })),
};
const VALID_SECRET = '0123456789abcdef0123456789abcdef';

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (callback: (tx: unknown) => unknown) => mockTransaction(callback),
  },
}));

vi.mock('@/lib/integrations/webhooks/repository', () => ({
  insertWebhookSubscription: (...args: unknown[]) => mockInsertWebhookSubscription(...args),
  updateWebhookSubscriptionById: (...args: unknown[]) => mockUpdateWebhookSubscriptionById(...args),
  getWebhookSubscriptionById: (...args: unknown[]) => mockGetWebhookSubscriptionById(...args),
  listWebhookSubscriptions: vi.fn(),
}));

vi.mock('@/lib/integrations/webhooks/validation', () => ({
  isPublicWebhookUrl: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/integrations/webhooks/secrets', () => ({
  encryptWebhookSecret: (...args: unknown[]) => mockEncryptWebhookSecret(...args),
}));

describe('managed webhook subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((callback) => callback(tx));
    mockEncryptWebhookSecret.mockReturnValue('enc:v1:test');
    auditValues.mockResolvedValue(undefined);
    mockInsertWebhookSubscription.mockResolvedValue({
      id: 10,
      name: 'Automação',
      targetUrl: 'https://example.com/webhook',
      secretCiphertext: 'enc:v1:test',
      subscribedEvents: ['associate.updated'],
      isActive: true,
      createdBy: 1,
    });
    mockGetWebhookSubscriptionById.mockResolvedValue({
      id: 10,
      name: 'Automação',
      targetUrl: 'https://example.com/webhook',
      secretCiphertext: 'enc:v1:old',
      subscribedEvents: ['associate.updated'],
      isActive: true,
      createdBy: 1,
    });
    mockUpdateWebhookSubscriptionById.mockResolvedValue({
      id: 10,
      name: 'Automação 2',
      targetUrl: 'https://example.com/webhook-2',
      secretCiphertext: 'enc:v1:test',
      subscribedEvents: ['monthly_payment.updated'],
      isActive: false,
      createdBy: 1,
    });
  });

  it('creates subscriptions with encrypted secrets and audit log', async () => {
    await createManagedWebhookSubscription(1, {
      name: 'Automação',
      targetUrl: 'https://example.com/webhook',
      secret: VALID_SECRET,
      subscribedEvents: ['associate.updated'],
    });

    expect(mockEncryptWebhookSecret).toHaveBeenCalledWith(VALID_SECRET);
    expect(mockInsertWebhookSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Automação',
        targetUrl: 'https://example.com/webhook',
        secretCiphertext: 'enc:v1:test',
        subscribedEvents: ['associate.updated'],
      }),
      tx,
    );
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_subscription_created',
        entityType: 'webhook_subscription',
        entityId: 10,
      }),
    );
  });

  it('updates public subscription fields without changing the secret', async () => {
    await updateManagedWebhookSubscription(1, {
      id: 10,
      name: 'Automação 2',
      targetUrl: 'https://example.com/webhook-2',
      subscribedEvents: ['monthly_payment.updated'],
      isActive: false,
    });

    expect(mockUpdateWebhookSubscriptionById).toHaveBeenCalledWith(
      10,
      {
        name: 'Automação 2',
        targetUrl: 'https://example.com/webhook-2',
        subscribedEvents: ['monthly_payment.updated'],
        isActive: false,
      },
      tx,
    );
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'webhook_subscription_updated' }),
    );
  });

  it('toggles active state with a dedicated audit action', async () => {
    await setManagedWebhookSubscriptionActive(1, 10, false);

    expect(mockUpdateWebhookSubscriptionById).toHaveBeenCalledWith(10, { isActive: false }, tx);
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'webhook_subscription_deactivated' }),
    );
  });

  it('rotates secrets without exposing previous ciphertext in audit changes', async () => {
    await rotateManagedWebhookSubscriptionSecret(1, 10, VALID_SECRET);

    expect(mockUpdateWebhookSubscriptionById).toHaveBeenCalledWith(
      10,
      { secretCiphertext: 'enc:v1:test' },
      tx,
    );
    expect(auditValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'webhook_subscription_secret_rotated',
        changes: null,
      }),
    );
  });
});
