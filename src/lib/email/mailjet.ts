/**
 * Mailjet email client
 *
 * Envio via API REST — não requer SMTP próprio.
 * Documentação: https://dev.mailjet.com/email/guides/send-api-v31/
 *
 * Limites Free tier: 200 e-mails/dia · 6.000/mês
 */
import Mailjet from 'node-mailjet';
import { env } from '@/lib/env';

let _client: Mailjet | null = null;

function getClient(): Mailjet {
  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) {
    throw new Error(
      'Mailjet não configurado. Defina MAILJET_API_KEY e MAILJET_SECRET_KEY no .env.',
    );
  }
  if (!_client) {
    _client = new Mailjet({
      apiKey: env.MAILJET_API_KEY,
      apiSecret: env.MAILJET_SECRET_KEY,
    });
  }
  return _client;
}

export interface SendEmailOptions {
  to: string | { email: string; name?: string }[];
  subject: string;
  /** HTML do corpo do e-mail */
  html: string;
  /** Texto plano (fallback) */
  text?: string;
  /** Remetente personalizado (sobrescreve o padrão do .env) */
  from?: { email: string; name?: string };
}

/**
 * Envia um e-mail via Mailjet API v3.1.
 *
 * @example
 * await sendEmail({
 *   to: 'usuario@asof.org.br',
 *   subject: 'Bem-vindo à Intranet ASOF',
 *   html: '<p>Olá!</p>',
 * });
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, text, from } = options;

  const recipients = Array.isArray(to)
    ? to.map((r) => (typeof r === 'string' ? { Email: r } : { Email: r.email, Name: r.name }))
    : [{ Email: to }];

  const sender = from
    ? { Email: from.email, Name: from.name }
    : { Email: env.MAILJET_SENDER_EMAIL, Name: env.MAILJET_SENDER_NAME };

  await getClient()
    .post('send', { version: 'v3.1' })
    .request({
      Messages: [
        {
          From: sender,
          To: recipients,
          Subject: subject,
          HTMLPart: html,
          ...(text ? { TextPart: text } : {}),
        },
      ],
    });
}
