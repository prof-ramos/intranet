import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendPinnedWebhook } from '@/lib/integrations/webhooks/transport';

type Lookup = (
  hostname: string,
  options: { family?: number; all?: boolean },
  callback: (...args: unknown[]) => void,
) => void;

const { agentCloseMock, agentOptions, fetchMock } = vi.hoisted(() => ({
  agentCloseMock: vi.fn(),
  agentOptions: { current: null as null | { connect: { lookup: Lookup } } },
  fetchMock: vi.fn(),
}));

vi.mock('undici', () => ({
  Agent: class AgentMock {
    constructor(options: { connect: { lookup: Lookup } }) {
      agentOptions.current = options;
    }

    close = agentCloseMock;
  },
  fetch: fetchMock,
}));

const target = {
  url: 'https://hooks.example.com/webhook',
  hostname: 'hooks.example.com',
  addresses: [
    { address: '93.184.216.34', family: 4 as const },
    { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 as const },
  ],
};

describe('sendPinnedWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentOptions.current = null;
    agentCloseMock.mockResolvedValue(undefined);
  });

  it('mantém a URL original e limita o lookup aos endereços aprovados', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      type: 'basic',
      text: () => Promise.resolve('OK'),
    });

    await expect(
      sendPinnedWebhook(target, { method: 'POST', redirect: 'manual', body: '{}' }),
    ).resolves.toEqual({ ok: true, status: 200, type: 'basic', body: 'OK' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        redirect: 'manual',
        dispatcher: expect.anything(),
      }),
    );
    expect(agentOptions.current).not.toHaveProperty('connect.rejectUnauthorized');

    const callback = vi.fn();
    agentOptions.current!.connect.lookup('hooks.example.com', { family: 4 }, callback);
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(agentCloseMock).toHaveBeenCalledTimes(1);
  });

  it('fecha o dispatcher quando o fetch falha', async () => {
    fetchMock.mockRejectedValue(new Error('connect failed'));

    await expect(sendPinnedWebhook(target, { method: 'POST' })).rejects.toThrow('connect failed');
    expect(agentCloseMock).toHaveBeenCalledTimes(1);
  });

  it('fecha o dispatcher quando a requisição é abortada por timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(
      sendPinnedWebhook(target, { method: 'POST', signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(agentCloseMock).toHaveBeenCalledTimes(1);
  });
});
