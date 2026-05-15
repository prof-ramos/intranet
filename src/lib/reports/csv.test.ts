import { describe, it, expect } from 'vitest';
import { toCsvCell, generateCsv, ALL_FIELDS } from './csv';
import type { ReportAssociate } from './queries';

// Minimal mock for ReportAssociate with keys matching ASSOCIATE_EXPORT_FIELDS
const mockRow = {
  id: 1,
  fullName: 'João Silva',
  siape: '1234567',
  associationStatus: 'ativo',
  functionalStatus: 'ativo',
  contributionStatus: 'em_dia',
  classPattern: 'A',
  assignment: 'Brasília',
  locationCountry: 'Brasil',
  locationCity: 'Brasília',
  cpfCiphertext: null,
  cpfHash: 'abc123',
  primaryEmailCiphertext: null,
  primaryEmailHash: 'def456',
  phoneCiphertext: null,
  phoneHash: 'ghi789',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
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

  it('prefixes tab before dash to prevent formula injection', () => {
    expect(toCsvCell('-negative')).toBe('"\t-negative"');
  });

  it('prefixes tab before equals sign to prevent formula injection', () => {
    expect(toCsvCell('=SUM(A1:A10)')).toBe('"\t=SUM(A1:A10)"');
  });

  it('prefixes tab before plus sign to prevent formula injection', () => {
    expect(toCsvCell('+1+1')).toBe('"\t+1+1"');
  });

  it('prefixes tab before at sign to prevent formula injection', () => {
    expect(toCsvCell('@SUM')).toBe('"\t@SUM"');
  });

  it('prefixes tab before tab character to prevent formula injection', () => {
    expect(toCsvCell('\tmalicious')).toBe('"\t\tmalicious"');
  });

  it('does not prefix tab for values that do not start with dangerous chars', () => {
    expect(toCsvCell('hello world')).toBe('"hello world"');
    expect(toCsvCell('123')).toBe('"123"');
  });

  it('prefixes tab before carriage return to prevent CSV row injection', () => {
    expect(toCsvCell('\rline2')).toBe('"\t\rline2"');
  });

  it('handles mixed CRLF inside a cell', () => {
    expect(toCsvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
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
    // Header should have only one column
    expect(lines[0]).toBe('"Nome"');
    // Data row should have only one column
    expect(lines[1]).toBe('"João Silva"');
  });

  it('uses ALL_FIELDS when selectedKeys is empty', () => {
    const csv = generateCsv([mockRow], []);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    // Should have all columns from ALL_FIELDS
    const headerParts = lines[0].split(',').length;
    expect(headerParts).toBe(ALL_FIELDS.length);
  });

  it('handles empty rows array', () => {
    const csv = generateCsv([], ['fullName']);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines.length).toBe(1); // Only header, no data rows
  });
});