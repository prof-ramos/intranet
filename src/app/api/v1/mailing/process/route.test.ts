import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from './route';

const mockProcessMailingBatch = vi.fn();

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'cron-secret',
  },
}));

vi.mock('@/lib/mailing/service', () => ({
  processMailingBatch: (...args: unknown[]) => mockProcessMailingBatch(...args),
}));

describe('/api/v1/mailing/process route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessMailingBatch.mockResolvedValue({ processed: 2, sent: 2, failed: 0 });
  });

  it('aceita cron bearer e processa o lote', async () => {
    const response = await GET(
      new Request('https://asof.local/api/v1/mailing/process', {
        headers: {
          authorization: 'Bearer cron-secret',
          'x-request-id': 'mailing-cron',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockProcessMailingBatch).toHaveBeenCalledWith(50);
    expect(body).toMatchObject({
      ok: true,
      data: {
        mode: 'scheduled',
        result: { processed: 2, sent: 2, failed: 0 },
      },
    });
  });

  it('rejeita sem autorização de cron', async () => {
    const response = await GET(new Request('https://asof.local/api/v1/mailing/process'));
    expect(response.status).toBe(401);
    expect(mockProcessMailingBatch).not.toHaveBeenCalled();
  });

  it('não permite métodos inseguros', async () => {
    const post = await POST(new Request('https://asof.local/api/v1/mailing/process'));
    const del = await DELETE(new Request('https://asof.local/api/v1/mailing/process'));
    expect(post.status).toBe(405);
    expect(del.status).toBe(405);
  });
});
