import { describe, it, expect, vi } from 'vitest';
import { buildPiiPatch, PII_FIELDS } from './pii-mapping';

vi.mock('@/lib/crypto/pii', () => ({
  encryptPii: vi.fn((v: string) => `enc:${v}`),
  piiBlindIndex: vi.fn((v: string) => `hash:${v}`),
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
  it('contains exactly 6 fields', () => {
    expect(PII_FIELDS).toHaveLength(6);
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
