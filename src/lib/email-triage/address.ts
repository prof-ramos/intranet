import { simpleParser } from 'mailparser';

const MAILBOX_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export async function extractSenderEmailForCorrelation(sender: string): Promise<string | null> {
  const normalizedSender = sender.replace(/[\r\n]+/g, ' ').trim();
  if (!normalizedSender) return null;

  try {
    const parsed = await simpleParser(`From: ${normalizedSender}\r\n\r\n`);
    const address = parsed.from?.value.at(0)?.address?.toLowerCase().trim();
    if (address) return address;
  } catch {
    // Fall through to a narrow mailbox fallback for malformed headers.
  }

  return normalizedSender.match(MAILBOX_RE)?.[0].toLowerCase().trim() ?? null;
}
