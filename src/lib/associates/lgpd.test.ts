import { describe, expect, it } from 'vitest';
import {
  canViewSensitiveFields,
  toAssociateProfileDTO,
  filterExportFieldsByRole,
  ASSOCIATE_EXPORT_FIELDS,
  SENSITIVE_FIELDS,
  PUBLIC_FIELDS,
  type Role,
} from '@/lib/associates/lgpd';
import type { Associate } from '@/lib/db/schema/associates';

function makeAssociate(overrides: Partial<Associate> = {}): Associate {
  return {
    id: 1,
    fullName: 'João Silva',
    cpf: '12345678901',
    siape: '1234567',
    primaryEmail: 'joao@example.com',
    secondaryEmail: 'joao.sec@example.com',
    phone: '(61) 99999-0000',
    whatsapp: '(61) 99999-1111',
    birthDate: '1990-05-15',
    address: 'SQN 123, Bloco A',
    locationCity: 'Brasília',
    locationCountry: 'Brasil',
    assignment: 'SERE',
    assignmentStartDate: '2015-03-01',
    classPattern: 'B',
    associationStatus: 'ativo',
    functionalStatus: 'ativo',
    contributionStatus: 'em_dia',
    associationCategory: 'efetivo',
    internalNotes: 'Observação interna',
    joinedAt: '2015-04-01',
    updatedAt: '2024-01-01',
    ...overrides,
  } as Associate;
}

describe('canViewSensitiveFields', () => {
  it('returns true for admin', () => {
    expect(canViewSensitiveFields('admin')).toBe(true);
  });

  it('returns true for diretoria', () => {
    expect(canViewSensitiveFields('diretoria')).toBe(true);
  });

  it('returns false for secretaria', () => {
    expect(canViewSensitiveFields('secretaria')).toBe(false);
  });
});

describe('toAssociateProfileDTO', () => {
  it('returns full associate for admin', () => {
    const assoc = makeAssociate();
    const result = toAssociateProfileDTO(assoc, 'admin');
    expect(result.cpf).toBe(assoc.cpf);
    expect(result.internalNotes).toBe(assoc.internalNotes);
  });

  it('returns full associate for diretoria', () => {
    const assoc = makeAssociate();
    const result = toAssociateProfileDTO(assoc, 'diretoria');
    expect(result.cpf).toBe(assoc.cpf);
  });

  it('masks sensitive fields for secretaria', () => {
    const assoc = makeAssociate();
    const result = toAssociateProfileDTO(assoc, 'secretaria');
    expect(result.cpf).toContain('***');
    expect(result.siape).toContain('**');
    expect(result.birthDate).toBeNull();
    expect(result.address).toBeNull();
    expect(result.internalNotes).toBeNull();
    expect(result.primaryEmail).toContain('***');
    expect(result.phone).toContain('****');
  });

  it('preserves public fields for secretaria', () => {
    const assoc = makeAssociate();
    const result = toAssociateProfileDTO(assoc, 'secretaria');
    expect(result.fullName).toBe(assoc.fullName);
    expect(result.assignment).toBe(assoc.assignment);
    expect(result.associationStatus).toBe(assoc.associationStatus);
  });
});

describe('filterExportFieldsByRole', () => {
  it('returns all fields for admin', () => {
    const result = filterExportFieldsByRole(ASSOCIATE_EXPORT_FIELDS, 'admin');
    expect(result).toHaveLength(ASSOCIATE_EXPORT_FIELDS.length);
  });

  it('returns all fields for diretoria', () => {
    const result = filterExportFieldsByRole(ASSOCIATE_EXPORT_FIELDS, 'diretoria');
    expect(result).toHaveLength(ASSOCIATE_EXPORT_FIELDS.length);
  });

  it('returns only public fields for secretaria', () => {
    const result = filterExportFieldsByRole(ASSOCIATE_EXPORT_FIELDS, 'secretaria');
    for (const field of result) {
      expect(field.sensitivity).toBe('public');
    }
  });
});

describe('SENSITIVE_FIELDS and PUBLIC_FIELDS', () => {
  it('sensitive and public fields do not overlap', () => {
    for (const key of SENSITIVE_FIELDS) {
      expect(PUBLIC_FIELDS.has(key)).toBe(false);
    }
  });

  it('all export fields are classified', () => {
    for (const field of ASSOCIATE_EXPORT_FIELDS) {
      expect(SENSITIVE_FIELDS.has(field.key as keyof Associate) || PUBLIC_FIELDS.has(field.key as keyof Associate)).toBe(true);
    }
  });
});