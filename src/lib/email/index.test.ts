import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, EmailSendError } from './index';

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    MAILJET_API_KEY: 'test-api-key',
    MAILJET_SECRET_KEY: 'test-secret-key',
    MAILJET_SENDER_EMAIL: 'no-reply@asof.org.br' as string | undefined,
    MAILJET_SENDER_NAME: 'ASOF Intranet',
    MAILJET_SENDER_VALIDATED: true,
  },
}));

vi.mock('@/lib/env', () => ({
  env: mockEnv,
}));

const message = {
  to: 'destinatario@asof.org.br',
  toName: 'João Silva',
  subject: 'Teste',
  htmlBody: '<p>Olá</p>',
  textBody: 'Olá',
};

describe('sendEmail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEnv.MAILJET_API_KEY = 'test-api-key';
    mockEnv.MAILJET_SECRET_KEY = 'test-secret-key';
    mockEnv.MAILJET_SENDER_EMAIL = 'no-reply@asof.org.br';
  });

  it('resolves without throwing on a successful HTTP response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    await expect(sendEmail(message)).resolves.toBeUndefined();
  });

  it('throws EmailSendError with the response status on HTTP failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(sendEmail(message)).rejects.toThrow(EmailSendError);
    await expect(sendEmail(message)).rejects.toMatchObject({ status: 401 });
  });

  it('propagates network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(sendEmail(message)).rejects.toThrow('fetch failed');
  });

  it('does not call Mailjet when sender is missing', async () => {
    mockEnv.MAILJET_SENDER_EMAIL = undefined;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(sendEmail(message)).rejects.toThrow(
      'MAILJET_SENDER_EMAIL is required to send email',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
