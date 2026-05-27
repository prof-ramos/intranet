import { env } from '@/lib/env';

export interface EmailMessage {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

export class EmailSendError extends Error {
  readonly code = 'EMAIL_SEND_FAILED';
  readonly status: number;

  constructor(status: number) {
    super(`Email send failed with status ${status}`);
    this.name = 'EmailSendError';
    this.status = status;
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`).toString('base64'),
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: env.MAILJET_SENDER_EMAIL,
            Name: env.MAILJET_SENDER_NAME,
          },
          To: [{ Email: message.to, Name: message.toName }],
          Subject: message.subject,
          HTMLPart: message.htmlBody,
          TextPart: message.textBody,
        },
      ],
    }),
  });

  if (!response.ok) {
    await response.text().catch(() => undefined);
    throw new EmailSendError(response.status);
  }
}
