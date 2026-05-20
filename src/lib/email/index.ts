import { env } from '@/lib/env'

export interface EmailMessage {
  to: string
  toName: string
  subject: string
  htmlBody: string
  textBody: string
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
            Email: 'noreply@asof.org.br',
            Name: env.MAILJET_SENDER_NAME,
          },
          To: [{ Email: message.to, Name: message.toName }],
          Subject: message.subject,
          HTMLPart: message.htmlBody,
          TextPart: message.textBody,
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Mailjet error ${response.status}: ${body}`)
  }
}
