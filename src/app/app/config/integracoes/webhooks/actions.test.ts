import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWebhookSubscription,
  rotateWebhookSubscriptionSecret,
  toggleWebhookSubscription,
  updateWebhookSubscription,
} from './actions';

const requireRoleMock = vi.fn();
const createManagedWebhookSubscriptionMock = vi.fn();
const rotateManagedWebhookSubscriptionSecretMock = vi.fn();
const setManagedWebhookSubscriptionActiveMock = vi.fn();
const updateManagedWebhookSubscriptionMock = vi.fn();
const revalidatePathMock = vi.fn();
const PUBLIC_WEBHOOK_DNS = [{ address: '93.184.216.34', family: 4 }];
const SSRF_URL_MESSAGE =
  'A URL deve usar HTTPS público; hosts locais, privados ou reservados não são permitidos.';

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
}));

vi.mock('node:dns/promises', () => ({
  lookup: lookupMock,
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/integrations/webhooks/subscriptions', () => ({
  createManagedWebhookSubscription: (...args: unknown[]) =>
    createManagedWebhookSubscriptionMock(...args),
  rotateManagedWebhookSubscriptionSecret: (...args: unknown[]) =>
    rotateManagedWebhookSubscriptionSecretMock(...args),
  setManagedWebhookSubscriptionActive: (...args: unknown[]) =>
    setManagedWebhookSubscriptionActiveMock(...args),
  updateManagedWebhookSubscription: (...args: unknown[]) =>
    updateManagedWebhookSubscriptionMock(...args),
  validateWebhookSubscriptionEvents: (events: string[]) => events,
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

function buildWebhookFormData() {
  const formData = new FormData();
  formData.set('name', 'Webhook principal');
  formData.set('targetUrl', 'https://example.com/webhook');
  formData.append('subscribedEvents', 'legal_consultation.created');
  formData.append('subscribedEvents', 'official_letter.created');
  return formData;
}

describe('config integracoes webhook actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupMock.mockResolvedValue(PUBLIC_WEBHOOK_DNS);
    requireRoleMock.mockResolvedValue({ userId: 7 });
    createManagedWebhookSubscriptionMock.mockResolvedValue(undefined);
    rotateManagedWebhookSubscriptionSecretMock.mockResolvedValue(undefined);
    setManagedWebhookSubscriptionActiveMock.mockResolvedValue(undefined);
    updateManagedWebhookSubscriptionMock.mockResolvedValue(undefined);
  });

  it('creates a webhook subscription and revalidates the page', async () => {
    const formData = buildWebhookFormData();
    formData.set('secret', 'a'.repeat(32));

    const result = await createWebhookSubscription(null, formData);

    expect(result).toEqual({ success: true, message: 'Webhook subscription criada.' });
    expect(createManagedWebhookSubscriptionMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: 'Webhook principal',
        targetUrl: 'https://example.com/webhook',
        subscribedEvents: ['legal_consultation.created', 'official_letter.created'],
        secret: 'a'.repeat(32),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes/webhooks');
  });

  it('returns zod validation feedback for an invalid secret', async () => {
    const formData = buildWebhookFormData();
    formData.set('secret', 'short');

    const result = await createWebhookSubscription(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'O segredo HMAC deve ter pelo menos 32 caracteres.',
    });
    expect(lookupMock).toHaveBeenCalledWith('example.com', { all: true });
    expect(createManagedWebhookSubscriptionMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rejects loopback webhook URLs before secret validation', async () => {
    const formData = buildWebhookFormData();
    formData.set('targetUrl', 'https://127.0.0.1/webhook');
    formData.set('secret', 'a'.repeat(32));

    const result = await createWebhookSubscription(null, formData);

    expect(result).toEqual({ success: false, message: SSRF_URL_MESSAGE });
    expect(lookupMock).not.toHaveBeenCalled();
    expect(createManagedWebhookSubscriptionMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rejects hostnames that resolve to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);
    const formData = buildWebhookFormData();
    formData.set('secret', 'a'.repeat(32));

    const result = await createWebhookSubscription(null, formData);

    expect(result).toEqual({ success: false, message: SSRF_URL_MESSAGE });
    expect(lookupMock).toHaveBeenCalledWith('example.com', { all: true });
    expect(createManagedWebhookSubscriptionMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('updates a webhook subscription from form data', async () => {
    const formData = buildWebhookFormData();
    formData.set('id', '12');
    formData.set('isActive', 'true');

    const result = await updateWebhookSubscription(null, formData);

    expect(result).toEqual({ success: true, message: 'Webhook subscription atualizada.' });
    expect(updateManagedWebhookSubscriptionMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        id: 12,
        isActive: true,
        name: 'Webhook principal',
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes/webhooks');
  });

  it('rejects invalid ids before toggling subscription status', async () => {
    const formData = new FormData();
    formData.set('id', '0');
    formData.set('isActive', 'false');

    const result = await toggleWebhookSubscription(null, formData);

    expect(result).toEqual({ success: false, message: 'Webhook subscription inválida.' });
    expect(setManagedWebhookSubscriptionActiveMock).not.toHaveBeenCalled();
  });

  it('rejects non-decimal subscription ids across update, toggle, and rotate', async () => {
    const updateFormData = buildWebhookFormData();
    updateFormData.set('id', '1e2');
    updateFormData.set('isActive', 'true');

    await expect(updateWebhookSubscription(null, updateFormData)).resolves.toEqual({
      success: false,
      message: 'Webhook subscription inválida.',
    });

    const toggleFormData = new FormData();
    toggleFormData.set('id', '0x10');
    toggleFormData.set('isActive', 'false');

    await expect(toggleWebhookSubscription(null, toggleFormData)).resolves.toEqual({
      success: false,
      message: 'Webhook subscription inválida.',
    });

    const rotateFormData = new FormData();
    rotateFormData.set('id', '1e2');
    rotateFormData.set('secret', 'b'.repeat(40));

    await expect(rotateWebhookSubscriptionSecret(null, rotateFormData)).resolves.toEqual({
      success: false,
      message: 'Webhook subscription inválida.',
    });

    expect(updateManagedWebhookSubscriptionMock).not.toHaveBeenCalled();
    expect(setManagedWebhookSubscriptionActiveMock).not.toHaveBeenCalled();
    expect(rotateManagedWebhookSubscriptionSecretMock).not.toHaveBeenCalled();
  });

  it('rotates a webhook secret and revalidates the page', async () => {
    const formData = new FormData();
    formData.set('id', '12');
    formData.set('secret', 'b'.repeat(40));

    const result = await rotateWebhookSubscriptionSecret(null, formData);

    expect(result).toEqual({ success: true, message: 'Segredo rotacionado.' });
    expect(rotateManagedWebhookSubscriptionSecretMock).toHaveBeenCalledWith(7, 12, 'b'.repeat(40));
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/integracoes/webhooks');
  });
});
