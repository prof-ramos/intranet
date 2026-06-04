import { describe, expect, it } from 'vitest';
import { extractSenderEmailForCorrelation } from '@/lib/email-triage/address';

describe('extractSenderEmailForCorrelation', () => {
  it('extracts the first mailbox from a formatted From header', async () => {
    await expect(
      extractSenderEmailForCorrelation('"Nome, Associado" <Associado@Example.COM>'),
    ).resolves.toBe('associado@example.com');
  });

  it('falls back to an RFC-like mailbox inside malformed input', async () => {
    await expect(
      extractSenderEmailForCorrelation('remetente invalido associado@example.com texto'),
    ).resolves.toBe('associado@example.com');
  });

  it('returns null when no mailbox can be extracted', async () => {
    await expect(extractSenderEmailForCorrelation('Sem endereco')).resolves.toBeNull();
  });
});
