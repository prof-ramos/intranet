import { describe, expect, it } from 'vitest';
import type { Associate } from '@/lib/db/schema/associates';
import { toMcpAssociate } from './pii';

const row = {
  id: 42,
  fullName: 'Pessoa Teste',
  assignment: 'SERE',
  cpf: null,
  cpfCiphertext: 'cipher-cpf',
  cpfHash: 'hash-cpf',
  siape: null,
  siapeCiphertext: 'cipher-siape',
  siapeHash: 'hash-siape',
  primaryEmail: null,
  primaryEmailCiphertext: 'cipher-email',
  primaryEmailHash: 'hash-email',
  secondaryEmail: 'secundario@example.test',
  phone: null,
  phoneCiphertext: 'cipher-phone',
  phoneHash: 'hash-phone',
  whatsapp: null,
  whatsappCiphertext: 'cipher-whatsapp',
  whatsappHash: 'hash-whatsapp',
  address: null,
  addressCiphertext: 'cipher-address',
  addressHash: 'hash-address',
  rg: null,
  rgCiphertext: 'cipher-rg',
  rgHash: 'hash-rg',
  birthDate: '1980-01-01',
  neighborhood: 'Centro',
  zipCode: '70000-000',
  internalNotes: 'restrito',
  sourcePayload: '{"legacy":true}',
} as unknown as Associate;

const decrypted = {
  cpf: '12345678901',
  siape: '1234567',
  primaryEmail: 'pessoa@example.test',
  phone: '61999999999',
  whatsapp: '61988888888',
  address: 'Rua Teste, 1',
  rg: '123456',
};

describe('política de PII do MCP', () => {
  it('omite campos sensíveis e armazenamento protegido por padrão', () => {
    const result = toMcpAssociate(row, null, false);

    expect(result).toMatchObject({ id: 42, fullName: 'Pessoa Teste', assignment: 'SERE' });
    expect(result).not.toHaveProperty('cpf');
    expect(result).not.toHaveProperty('primaryEmail');
    expect(result).not.toHaveProperty('internalNotes');
    expect(result).not.toHaveProperty('cpfCiphertext');
    expect(result).not.toHaveProperty('cpfHash');
    expect(result).not.toHaveProperty('sourcePayload');
  });

  it('inclui plaintext descriptografado quando explicitamente solicitado', () => {
    const result = toMcpAssociate(row, decrypted, true);

    expect(result.cpf).toBe('12345678901');
    expect(result.primaryEmail).toBe('pessoa@example.test');
    expect(result.internalNotes).toBe('restrito');
    expect(result).not.toHaveProperty('cpfCiphertext');
    expect(result).not.toHaveProperty('cpfHash');
    expect(result).not.toHaveProperty('sourcePayload');
  });
});
