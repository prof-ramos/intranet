import { describe, expect, it } from 'vitest';
import { generateGmailContactsCsv } from './csv';
import { parseMalaDiretaFilters } from './filters';
import { GMAIL_CONTACTS_HEADERS } from './types';

describe('generateGmailContactsCsv', () => {
  it('emits English Gmail Contacts headers with BOM and CRLF', () => {
    const csv = generateGmailContactsCsv([
      {
        name: 'Adalardo Nunciato Santiago',
        firstName: 'Adalardo',
        lastName: 'Santiago',
        email: 'ansantiago77@example.com',
      },
    ]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(GMAIL_CONTACTS_HEADERS.map((h) => `"${h}"`).join(','));
    expect(csv).toContain('\r\n');
    expect(csv).toContain('"Adalardo Nunciato Santiago","Adalardo","Santiago","ansantiago77@example.com"');
  });

  it('escapes quotes and prefixes formula-like cells', () => {
    const csv = generateGmailContactsCsv([
      {
        name: 'Say "Hello"',
        firstName: 'Say',
        lastName: 'Hello',
        email: '=cmd()',
      },
    ]);

    expect(csv).toContain('"Say ""Hello"""');
    expect(csv).toContain('"\t=cmd()"');
  });
});

describe('parseMalaDiretaFilters', () => {
  it('defaults associationStatus to associado', () => {
    expect(parseMalaDiretaFilters(new URLSearchParams())).toEqual({
      associationStatus: 'associado',
    });
  });

  it('accepts functionalStatus and location and clears association with todos', () => {
    const params = new URLSearchParams({
      associationStatus: 'todos',
      functionalStatus: 'ativo',
      location: 'exterior',
    });
    expect(parseMalaDiretaFilters(params)).toEqual({
      functionalStatus: 'ativo',
      location: 'exterior',
    });
  });

  it('ignores invalid enum values', () => {
    const params = new URLSearchParams({
      associationStatus: 'inativo',
      functionalStatus: 'xyz',
      location: 'lua',
    });
    expect(parseMalaDiretaFilters(params)).toEqual({
      associationStatus: 'associado',
    });
  });
});
