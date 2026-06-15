import { describe, it, expect, vi } from 'vitest';
import { buildPiiPatch, decryptAssociatePii, PII_FIELDS } from './pii-mapping';

vi.mock('@/lib/crypto/pii', () => ({
  encryptPii: vi.fn((v: string) => `enc:${v}`),
  piiBlindIndex: vi.fn((v: string) => `hash:${v}`),
  decryptPiiField: vi.fn((ciphertext: string | null, plaintext: string | null) =>
    ciphertext ? ciphertext.replace(/^enc:/, '') : plaintext,
  ),
}));

describe('buildPiiPatch', () => {
  it('returns all undefined when input is empty', () => {
    const patch = buildPiiPatch({});

    for (const field of PII_FIELDS) {
      expect(patch[field.plaintextCol]).toBeUndefined();
      expect(patch[field.ciphertextCol]).toBeUndefined();
      expect(patch[field.hashCol]).toBeUndefined();
    }
  });

  it('encrypts and indexes a non-null string value', () => {
    const patch = buildPiiPatch({ cpf: '12345678901' });

    expect(patch.cpf).toBeNull();
    expect(patch.cpfCiphertext).toBe('enc:12345678901');
    expect(patch.cpfHash).toBe('hash:12345678901');
  });

  it('sets ciphertext and hash to null when value is explicitly null', () => {
    const patch = buildPiiPatch({ cpf: null });

    expect(patch.cpf).toBeNull();
    expect(patch.cpfCiphertext).toBeNull();
    expect(patch.cpfHash).toBeNull();
  });

  it('omits all three columns when value is undefined', () => {
    const patch = buildPiiPatch({ cpf: undefined });

    expect(patch.cpf).toBeUndefined();
    expect(patch.cpfCiphertext).toBeUndefined();
    expect(patch.cpfHash).toBeUndefined();
  });

  it('handles mixed presence across multiple fields', () => {
    const patch = buildPiiPatch({
      cpf: '123',
      siape: null,
      primaryEmail: 'a@b.com',
      phone: undefined,
    });

    // cpf: set to non-null string
    expect(patch.cpf).toBeNull();
    expect(patch.cpfCiphertext).toBe('enc:123');
    expect(patch.cpfHash).toBe('hash:123');

    // siape: explicitly null
    expect(patch.siape).toBeNull();
    expect(patch.siapeCiphertext).toBeNull();
    expect(patch.siapeHash).toBeNull();

    // primaryEmail: set to non-null string
    expect(patch.primaryEmail).toBeNull();
    expect(patch.primaryEmailCiphertext).toBe('enc:a@b.com');
    expect(patch.primaryEmailHash).toBe('hash:a@b.com');

    // phone: undefined (omitted)
    expect(patch.phone).toBeUndefined();
    expect(patch.phoneCiphertext).toBeUndefined();
    expect(patch.phoneHash).toBeUndefined();
  });

  it('handles empty string as non-null (encrypts it)', () => {
    const patch = buildPiiPatch({ cpf: '' });

    expect(patch.cpf).toBeNull();
    expect(patch.cpfCiphertext).toBe('enc:');
    expect(patch.cpfHash).toBe('hash:');
  });

  it('covers all registered PII fields in a single call', () => {
    const patch = buildPiiPatch({
      cpf: '1',
      siape: '2',
      primaryEmail: '3',
      phone: '4',
      whatsapp: '5',
      address: '6',
    });

    expect(patch.cpfCiphertext).toBe('enc:1');
    expect(patch.siapeCiphertext).toBe('enc:2');
    expect(patch.primaryEmailCiphertext).toBe('enc:3');
    expect(patch.phoneCiphertext).toBe('enc:4');
    expect(patch.whatsappCiphertext).toBe('enc:5');
    expect(patch.addressCiphertext).toBe('enc:6');
  });
});

describe('PII_FIELDS registry', () => {
  it('contains exactly 7 fields', () => {
    expect(PII_FIELDS).toHaveLength(7);
  });

  it('has unique names across all entries', () => {
    const names = PII_FIELDS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has unique columns across all entries', () => {
    const allCols = PII_FIELDS.flatMap((f) => [f.plaintextCol, f.ciphertextCol, f.hashCol]);
    expect(new Set(allCols).size).toBe(allCols.length);
  });
});

describe('decryptAssociatePii', () => {
  it('decrypts all registered PII fields from ciphertext', () => {
    const decrypted = decryptAssociatePii({
      cpf: null,
      cpfCiphertext: 'enc:1',
      cpfHash: 'hash:1',
      siape: null,
      siapeCiphertext: 'enc:2',
      siapeHash: 'hash:2',
      primaryEmail: null,
      primaryEmailCiphertext: 'enc:3',
      primaryEmailHash: 'hash:3',
      phone: null,
      phoneCiphertext: 'enc:4',
      phoneHash: 'hash:4',
      whatsapp: null,
      whatsappCiphertext: 'enc:5',
      whatsappHash: 'hash:5',
      address: null,
      addressCiphertext: 'enc:6',
      addressHash: 'hash:6',
      rg: null,
      rgCiphertext: 'enc:7',
      rgHash: 'hash:7',
    });

    expect(decrypted).toEqual({
      cpf: '1',
      siape: '2',
      primaryEmail: '3',
      phone: '4',
      whatsapp: '5',
      address: '6',
      rg: '7',
    });
  });

  it('keeps plaintext as legacy fallback when ciphertext is missing', () => {
    const decrypted = decryptAssociatePii({
      cpf: '1',
      cpfCiphertext: null,
      cpfHash: null,
      siape: '2',
      siapeCiphertext: null,
      siapeHash: null,
      primaryEmail: '3',
      primaryEmailCiphertext: null,
      primaryEmailHash: null,
      phone: '4',
      phoneCiphertext: null,
      phoneHash: null,
      whatsapp: '5',
      whatsappCiphertext: null,
      whatsappHash: null,
      address: '6',
      addressCiphertext: null,
      addressHash: null,
      rg: '7',
      rgCiphertext: null,
      rgHash: null,
    });

    expect(decrypted).toEqual({
      cpf: '1',
      siape: '2',
      primaryEmail: '3',
      phone: '4',
      whatsapp: '5',
      address: '6',
      rg: '7',
    });
  });
});
