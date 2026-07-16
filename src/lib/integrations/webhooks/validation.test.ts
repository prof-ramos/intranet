import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePublicWebhookTarget } from './validation';

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({
  lookup: lookupMock,
}));

describe('resolvePublicWebhookTarget', () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejeita toda a resolução quando apenas um dos endereços é privado', async () => {
    lookupMock.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expect(
      resolvePublicWebhookTarget('https://hooks.example.com/webhook'),
    ).resolves.toBeNull();
  });

  it('rejeita uma resolução vazia ou com família desconhecida', async () => {
    lookupMock.mockResolvedValueOnce([]);
    await expect(
      resolvePublicWebhookTarget('https://empty.example.com/webhook'),
    ).resolves.toBeNull();

    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 0 }]);
    await expect(
      resolvePublicWebhookTarget('https://unknown-family.example.com/webhook'),
    ).resolves.toBeNull();
  });

  it('rejeita a URL quando a resolução DNS falha', async () => {
    lookupMock.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(
      resolvePublicWebhookTarget('https://missing.example.com/webhook'),
    ).resolves.toBeNull();
  });

  it('rejeita a URL quando a resolução DNS excede o timeout', async () => {
    vi.useFakeTimers();
    lookupMock.mockReturnValue(new Promise(() => {}));

    const result = resolvePublicWebhookTarget('https://slow.example.com/webhook');
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toBeNull();
  });

  it('transforma IP público direto em alvo pinado sem consultar DNS', async () => {
    await expect(resolvePublicWebhookTarget('https://8.8.8.8/webhook')).resolves.toEqual({
      url: 'https://8.8.8.8/webhook',
      hostname: '8.8.8.8',
      addresses: [{ address: '8.8.8.8', family: 4 }],
    });
    expect(lookupMock).not.toHaveBeenCalled();
  });
});
