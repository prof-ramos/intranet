import { describe, it, expect } from 'vitest';
import { toCsvCell, generateCsv, ALL_FIELDS } from './csv';
import type { ReportAssociate } from './queries';

// Mock row with all new fields matching ASSOCIATE_EXPORT_FIELDS
const mockRow = {
  id: 1,
  fullName: 'João Silva',
  sex: 'masculino',
  maritalStatus: 'casado',
  birthDate: '1985-03-15',
  birthCity: 'São Paulo',
  birthState: 'SP',
  cpf: '123.456.789-00',
  rg: '12.345.678-9',
  rgIssuer: 'SSP',
  rgState: 'SP',
  rgExpeditionDate: '2005-10-20',
  primaryEmail: 'joao@example.com',
  secondaryEmail: 'joao.alt@example.com',
  phone: '(11) 98765-4321',
  whatsapp: '(11) 98765-4321',
  address: 'Rua das Flores, 123',
  neighborhood: 'Centro',
  addressState: 'SP',
  zipCode: '01001-000',
  locationCity: 'Brasília',
  locationCountry: 'Brasil',
  siape: '1234567',
  assignment: 'Brasília',
  assignmentStartDate: '2010-01-15',
  classPattern: 'A',
  functionalStatus: 'ativo',
  associationStatus: 'ativo',
  contributionStatus: 'em_dia',
  joinedAt: '2010-02-01',
  associationCategory: 'efetivo',
  missionType: 'permanente',
  careerOrigin: 'concurso',
  admissionDate: '2010-01-15',
  inaugurationDate: '2010-02-01',
  cancellationDate: null,
  paymentMethod: 'folha',
  ceocMember: true,
  caocMember: false,
} as unknown as ReportAssociate;

describe('toCsvCell', () => {
  it('returns quoted string for normal values', () => {
    expect(toCsvCell('hello')).toBe('"hello"');
    expect(toCsvCell('123')).toBe('"123"');
  });

  it('returns empty quoted string for null', () => {
    expect(toCsvCell(null)).toBe('""');
  });

  it('returns empty quoted string for undefined', () => {
    expect(toCsvCell(undefined)).toBe('""');
  });

  it('returns empty quoted string for empty string', () => {
    expect(toCsvCell('')).toBe('""');
  });

  it('doubles internal double quotes (escaping)', () => {
    expect(toCsvCell('say "hello"')).toBe('"say ""hello"""');
  });

  it('prefixes tab before dangerous chars to prevent formula injection', () => {
    expect(toCsvCell('-negative')).toBe('"\t-negative"');
    expect(toCsvCell('=SUM(A1:A10)')).toBe('"\t=SUM(A1:A10)"');
    expect(toCsvCell('+1+1')).toBe('"\t+1+1"');
    expect(toCsvCell('@SUM')).toBe('"\t@SUM"');
    expect(toCsvCell('\tmalicious')).toBe('"\t\tmalicious"');
  });

  it('does not prefix tab for safe values', () => {
    expect(toCsvCell('hello world')).toBe('"hello world"');
    expect(toCsvCell('123')).toBe('"123"');
  });

  it('prefixes tab before carriage return', () => {
    expect(toCsvCell('\rline2')).toBe('"\t\rline2"');
  });
});

describe('CSV field formatting', () => {
  it('formats boolean fields as Sim/Não', () => {
    const ceocMemberField = ALL_FIELDS.find((f) => f.key === 'ceocMember');
    const caocMemberField = ALL_FIELDS.find((f) => f.key === 'caocMember');
    expect(ceocMemberField).toBeDefined();
    expect(caocMemberField).toBeDefined();
    // ceocMember is true → "Sim"
    expect(ceocMemberField!.get(mockRow)).toBe('Sim');
    // caocMember is false → "Não"
    expect(caocMemberField!.get(mockRow)).toBe('Não');
  });

  it('formats enum fields with Portuguese labels', () => {
    const sexField = ALL_FIELDS.find((f) => f.key === 'sex');
    const functionalStatusField = ALL_FIELDS.find((f) => f.key === 'functionalStatus');
    const missionTypeField = ALL_FIELDS.find((f) => f.key === 'missionType');
    const paymentMethodField = ALL_FIELDS.find((f) => f.key === 'paymentMethod');

    expect(sexField!.get(mockRow)).toBe('Masculino');
    expect(functionalStatusField!.get(mockRow)).toBe('Ativo');
    expect(missionTypeField!.get(mockRow)).toBe('Permanente');
    expect(paymentMethodField!.get(mockRow)).toBe('Folha');
  });

  it('formats date fields as dd/MM/yyyy', () => {
    const birthDateField = ALL_FIELDS.find((f) => f.key === 'birthDate');
    expect(birthDateField).toBeDefined();
    const formatted = birthDateField!.get(mockRow);
    expect(formatted).toBe('15/03/1985');
  });

  it('returns null for null date fields', () => {
    const cancellationDateField = ALL_FIELDS.find((f) => f.key === 'cancellationDate');
    expect(cancellationDateField).toBeDefined();
    expect(cancellationDateField!.get(mockRow)).toBeNull();
  });

  it('returns null for null boolean fields', () => {
    // mockRow has ceocMember=true and caocMember=false, but if a row had null
    const nullRow = { ...mockRow, ceocMember: null, caocMember: null } as unknown as ReportAssociate;
    const ceocMemberField = ALL_FIELDS.find((f) => f.key === 'ceocMember');
    expect(ceocMemberField!.get(nullRow)).toBeNull();
  });
});

describe('generateCsv', () => {
  it('produces BOM-prefixed UTF-8 CSV with CRLF line endings', () => {
    const csv = generateCsv([mockRow], ['fullName', 'associationStatus']);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('\r\n');
  });

  it('includes header row with field labels', () => {
    const csv = generateCsv([mockRow], ['fullName', 'associationStatus']);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines[0]).toContain('"Nome"');
    expect(lines[0]).toContain('"Situação Associativa"');
  });

  it('filters columns by selectedKeys', () => {
    const csv = generateCsv([mockRow], ['fullName']);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines[0]).toBe('"Nome"');
    expect(lines[1]).toBe('"João Silva"');
  });

  it('uses ALL_FIELDS when selectedKeys is empty', () => {
    const csv = generateCsv([mockRow], []);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    const headerParts = lines[0].split(',').length;
    expect(headerParts).toBe(ALL_FIELDS.length);
  });

  it('handles empty rows array', () => {
    const csv = generateCsv([], ['fullName']);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines.length).toBe(1); // Only header, no data rows
  });
});

describe('ALL_FIELDS completeness', () => {
  it('includes all new fields added in the expansion', () => {
    const keys = ALL_FIELDS.map((f) => f.key);
    const newFields = [
      'sex', 'maritalStatus', 'birthCity', 'birthState', 'rg', 'rgIssuer',
      'rgState', 'neighborhood', 'addressState', 'zipCode', 'missionType',
      'careerOrigin', 'admissionDate', 'inaugurationDate', 'cancellationDate',
      'paymentMethod', 'ceocMember', 'caocMember', 'secondaryEmail',
    ];
    for (const field of newFields) {
      expect(keys).toContain(field);
    }
  });

  it('has correct labels for key fields', () => {
    const fieldMap = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f.label]));
    expect(fieldMap['sex']).toBe('Sexo');
    expect(fieldMap['rg']).toBe('RG');
    expect(fieldMap['paymentMethod']).toBe('Forma de Pagamento');
    expect(fieldMap['ceocMember']).toBe('Membro CEOC');
    expect(fieldMap['caocMember']).toBe('Membro CAOC');
    expect(fieldMap['missionType']).toBe('Tipo de Missão');
    expect(fieldMap['careerOrigin']).toBe('Origem de Carreira');
  });
});