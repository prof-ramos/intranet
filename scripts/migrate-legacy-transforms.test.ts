import { describe, it, expect } from 'vitest';
import {
  nullIfEmpty,
  parseDate,
  mapSex,
  mapMaritalStatus,
  mapMissionType,
  mapCareerOrigin,
  mapAssociationStatus,
  mapUfWithAcSentinel,
  mapBoolean,
  normalizeCpf,
  normalizeSiape,
  normalizePhone,
  normalizeCep,
  parseDependents,
  parseConvenios,
  mapFunctionalStatus,
  transformLegacyRecord,
} from './migrate-legacy-transforms';

// ---------------------------------------------------------------------------
// nullIfEmpty
// ---------------------------------------------------------------------------
describe('nullIfEmpty', () => {
  it('returns null for dash sentinel', () => expect(nullIfEmpty('-')).toBeNull());
  it('returns null for empty string', () => expect(nullIfEmpty('')).toBeNull());
  it('returns null for whitespace', () => expect(nullIfEmpty('   ')).toBeNull());
  it('returns null for null', () => expect(nullIfEmpty(null)).toBeNull());
  it('returns null for undefined', () => expect(nullIfEmpty(undefined)).toBeNull());
  it('trims and returns non-empty strings', () => expect(nullIfEmpty('  hello  ')).toBe('hello'));
});

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------
describe('parseDate', () => {
  it('parses D/M/YYYY format', () => {
    expect(parseDate('8/10/1946')).toBe('1946-10-08');
  });
  it('parses zero-padded dates', () => {
    expect(parseDate('15/11/1985')).toBe('1985-11-15');
  });
  it('returns null for dash sentinel', () => {
    expect(parseDate('-')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });
  it('returns null for garbage dates', () => {
    expect(parseDate('2/2/2')).toBeNull();
    expect(parseDate('1/0/0')).toBeNull();
    expect(parseDate('1/1/1')).toBeNull();
  });
  it('handles two-digit years (assume < 50 → 2000s)', () => {
    expect(parseDate('3/5/94')).toBe('1994-05-03');
  });
  it('returns null for invalid month/day', () => {
    expect(parseDate('32/13/2020')).toBeNull();
  });
  it('returns null for null input', () => {
    expect(parseDate(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Enum mappers
// ---------------------------------------------------------------------------
describe('mapSex', () => {
  it('maps M and F correctly', () => {
    expect(mapSex('M')).toBe('M');
    expect(mapSex('F')).toBe('F');
  });
  it('returns null for dash', () => expect(mapSex('-')).toBeNull());
  it('returns null for unrecognized values', () => expect(mapSex('X')).toBeNull());
});

describe('mapMaritalStatus', () => {
  it('maps all known values', () => {
    expect(mapMaritalStatus('CASADO(A)')).toBe('casado');
    expect(mapMaritalStatus('SOLTEIRO(A)')).toBe('solteiro');
    expect(mapMaritalStatus('DIVORCIADO(A)')).toBe('divorciado');
    expect(mapMaritalStatus('VIÚVO(A)')).toBe('viuvo');
    expect(mapMaritalStatus('SEPARADO(A)')).toBe('separado');
    expect(mapMaritalStatus('OUTROS')).toBe('outros');
  });
  it('returns null for dash', () => expect(mapMaritalStatus('-')).toBeNull());
});

describe('mapMissionType', () => {
  it('maps known values', () => {
    expect(mapMissionType('PERMANENTE')).toBe('permanente');
    expect(mapMissionType('TRANSITÓRIA')).toBe('transitoria');
    expect(mapMissionType('TRANSITORIA')).toBe('transitoria');
  });
  it('returns null for dash', () => expect(mapMissionType('-')).toBeNull());
});

describe('mapCareerOrigin', () => {
  it('maps known values', () => {
    expect(mapCareerOrigin('BRASIL')).toBe('brasil');
    expect(mapCareerOrigin('EXTERIOR')).toBe('exterior');
    expect(mapCareerOrigin('OUTROS ÓRGÃOS')).toBe('outros_orgaos');
  });
  it('returns null for dash', () => expect(mapCareerOrigin('-')).toBeNull());
});

describe('mapAssociationStatus', () => {
  it('maps sim to ativo', () => expect(mapAssociationStatus('sim')).toBe('ativo'));
  it('maps não to inativo', () => expect(mapAssociationStatus('não')).toBe('inativo'));
  it('maps nao to inativo (no accent)', () => expect(mapAssociationStatus('nao')).toBe('inativo'));
  it('returns null for dash', () => expect(mapAssociationStatus('-')).toBeNull());
});

// ---------------------------------------------------------------------------
// AC sentinel
// ---------------------------------------------------------------------------
describe('mapUfWithAcSentinel', () => {
  it('maps AC to null (a confirmar sentinel)', () => {
    expect(mapUfWithAcSentinel('AC')).toBeNull();
  });
  it('preserves valid state codes', () => {
    expect(mapUfWithAcSentinel('DF')).toBe('DF');
    expect(mapUfWithAcSentinel('RJ')).toBe('RJ');
    expect(mapUfWithAcSentinel('SP')).toBe('SP');
  });
  it('preserves EXTERIOR', () => {
    expect(mapUfWithAcSentinel('EXTERIOR')).toBe('EXTERIOR');
  });
  it('returns null for dash', () => {
    expect(mapUfWithAcSentinel('-')).toBeNull();
  });
  it('trims and uppercases', () => {
    expect(mapUfWithAcSentinel(' mg ')).toBe('MG');
  });
});

// ---------------------------------------------------------------------------
// mapBoolean
// ---------------------------------------------------------------------------
describe('mapBoolean', () => {
  it('maps sim to true', () => expect(mapBoolean('sim')).toBe(true));
  it('maps não to false', () => expect(mapBoolean('não')).toBe(false));
  it('maps nao to false (no accent)', () => expect(mapBoolean('nao')).toBe(false));
  it('returns null for dash', () => expect(mapBoolean('-')).toBeNull());
  it('returns false for other values', () => expect(mapBoolean('other')).toBe(false));
});

// ---------------------------------------------------------------------------
// CPF normalization
// ---------------------------------------------------------------------------
describe('normalizeCpf', () => {
  it('validates a correct CPF', () => {
    // 104.332.181-00 is a valid CPF with correct check digits
    const result = normalizeCpf('104.332.181-00');
    expect(result.valid).toBe(true);
    expect(result.digits).toBe('10433218100');
    expect(result.issue).toBe('ok');
  });
  it('strips formatting', () => {
    const result = normalizeCpf('10433218100');
    expect(result.valid).toBe(true);
    expect(result.digits).toBe('10433218100');
  });
  it('returns non_numeric for alphabetic values', () => {
    const result = normalizeCpf('gabi');
    expect(result.issue).toBe('non_numeric');
    expect(result.digits).toBeNull();
  });
  it('returns wrong_length for 10 digits', () => {
    const result = normalizeCpf('1234567890');
    expect(result.issue).toBe('wrong_length');
    expect(result.digits).toBeNull();
  });
  it('returns malformed for dash', () => {
    const result = normalizeCpf('-');
    expect(result.issue).toBe('malformed');
    expect(result.digits).toBeNull();
  });
  it('returns malformed for empty', () => {
    const result = normalizeCpf('');
    expect(result.issue).toBe('malformed');
  });
  it('returns invalid_check_digits for invalid CPF', () => {
    const result = normalizeCpf('12345678901');
    expect(result.issue).toBe('invalid_check_digits');
    expect(result.digits).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SIAPE normalization
// ---------------------------------------------------------------------------
describe('normalizeSiape', () => {
  it('strips FALECIDO(A) annotation', () => {
    expect(normalizeSiape('1181580 (FALECIDO(A))')).toBe('1181580');
  });
  it('strips FALECIDO annotation (no A)', () => {
    expect(normalizeSiape('1181580 (FALECIDO)')).toBe('1181580');
  });
  it('returns clean SIAPE unchanged', () => {
    expect(normalizeSiape('1181580')).toBe('1181580');
  });
  it('returns null for dash', () => expect(normalizeSiape('-')).toBeNull());
});

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------
describe('normalizePhone', () => {
  it('strips formatting', () => {
    expect(normalizePhone('(61) 3577-4021')).toBe('6135774021');
  });
  it('takes first number when separated by /', () => {
    expect(normalizePhone('(61) 9 9577.4021 / 9 9913-2017')).toBe('61995774021');
  });
  it('returns null for dash', () => expect(normalizePhone('-')).toBeNull());
});

// ---------------------------------------------------------------------------
// CEP normalization
// ---------------------------------------------------------------------------
describe('normalizeCep', () => {
  it('strips dash', () => expect(normalizeCep('71520-100')).toBe('71520100'));
  it('strips dot and dash', () => expect(normalizeCep('88.103-465')).toBe('88103465'));
  it('returns clean CEP unchanged', () => expect(normalizeCep('71660120')).toBe('71660120'));
  it('returns null for dash', () => expect(normalizeCep('-')).toBeNull());
});

// ---------------------------------------------------------------------------
// Dependent parsing
// ---------------------------------------------------------------------------
describe('parseDependents', () => {
  it('parses a single dependent', () => {
    const result = parseDependents('DANIEL DA ROCHA TORRES (FILHO(A))');
    expect(result).toEqual([{ name: 'DANIEL DA ROCHA TORRES', relationship: 'FILHO(A)' }]);
  });
  it('parses multiple dependents', () => {
    const result = parseDependents(
      'HENRI ADAM DIKOUS DE OLIVEIRA (FILHO(A))CHLOÉ EVA DIKOUS DE OLIVEIRA (FILHO(A))',
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'HENRI ADAM DIKOUS DE OLIVEIRA', relationship: 'FILHO(A)' });
    expect(result[1]).toEqual({ name: 'CHLOÉ EVA DIKOUS DE OLIVEIRA', relationship: 'FILHO(A)' });
  });
  it('returns empty array for dash', () => {
    expect(parseDependents('-')).toEqual([]);
  });
  it('returns empty array for null', () => {
    expect(parseDependents(null)).toEqual([]);
  });
  it('handles unparseable text as desconhecido', () => {
    const result = parseDependents('SOME TEXT WITHOUT PARENS');
    expect(result).toHaveLength(1);
    expect(result[0].relationship).toBe('desconhecido');
  });
});

// ---------------------------------------------------------------------------
// Convênios parsing
// ---------------------------------------------------------------------------
describe('parseConvenios', () => {
  it('parses a single provider', () => {
    expect(parseConvenios('AMIL')).toEqual(['AMIL']);
  });
  it('parses compound providers', () => {
    const result = parseConvenios('AMILODONTOEMPRESASINDITAMARATY');
    expect(result).toEqual(['AMIL', 'ODONTOEMPRESA', 'SINDITAMARATY']);
  });
  it('returns empty for dash', () => {
    expect(parseConvenios('-')).toEqual([]);
  });
  it('returns empty for null', () => {
    expect(parseConvenios(null)).toEqual([]);
  });
  it('handles SINDITAMARATY alone', () => {
    expect(parseConvenios('SINDITAMARATY')).toEqual(['SINDITAMARATY']);
  });
});

// ---------------------------------------------------------------------------
// Functional status
// ---------------------------------------------------------------------------
describe('mapFunctionalStatus', () => {
  it('returns em_licenca when Licença is 1', () => {
    expect(mapFunctionalStatus('ATIVO - BRASÍLIA', '1')).toBe('em_licenca');
  });
  it('returns aposentado when Lotação contains APOSENTADO', () => {
    expect(mapFunctionalStatus('APOSENTADO', '-')).toBe('aposentado');
  });
  it('returns aposentado when Lotação contains INATIVO', () => {
    expect(mapFunctionalStatus('INATIVO - SERVIDOR APOSENTADO', '-')).toBe('aposentado');
  });
  it('returns cedido when Lotação contains CEDIDO', () => {
    expect(mapFunctionalStatus('CEDIDO - MINISTÉRIO', '-')).toBe('cedido');
  });
  it('returns ativo by default', () => {
    expect(mapFunctionalStatus('ATIVO - BRASÍLIA', '-')).toBe('ativo');
  });
  it('returns null when both are null', () => {
    expect(mapFunctionalStatus(null, null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// transformLegacyRecord integration
// ---------------------------------------------------------------------------
describe('transformLegacyRecord', () => {
  it('transforms a complete record', () => {
    const record: Record<string, string> = {
      Nome: 'JOÃO SILVA',
      Sexo: 'M',
      'E-mail': 'joao@example.com',
      Naturalidade: 'RIO DE JANEIRO',
      UF: 'RJ',
      'Estado Civil': 'CASADO(A)',
      'Número de Dependentes': '2',
      Dependentes: 'MARIA SILVA (FILHO(A))PEDRO SILVA (FILHO(A))',
      'Data de Nascimento': '15/3/1980',
      'C.P.F.': '104.332.181-00',
      'R.G.': '1234567',
      'UF_2': 'RJ',
      'Órgão Expedidor': 'SSP',
      'Data de Expedição': '10/5/2000',
      Endereço: 'RUA A, 123',
      Cidade: 'RIO DE JANEIRO',
      'UF_3': 'RJ',
      Bairro: 'COPACABANA',
      'C.E.P.': '22010-000',
      País: 'BRASIL',
      Telefone: '(21) 3333-4444',
      Celular: '(21) 99999-8888',
      Fax: '-',
      'Matrícula SIAPE': '1234567',
      CEOC: 'não',
      CAOC: 'sim',
      'Data de Admissão': '1/3/2005',
      'Data de Posse': '1/4/2005',
      Origem: 'BRASIL',
      Lotação: 'ATIVO - BRASÍLIA',
      'Data de Lotação': '15/1/2020',
      Missão: 'PERMANENTE',
      Associado: 'sim',
      'Data de Adesão': '1/1/2000',
      Licença: '-',
      'Data de Licença': '-',
      'Data de Cancelamento': '-',
      'Classe e Padrão': 'CLASSE C - V',
      'Convênios': 'SINDITAMARATY',
    };

    const result = transformLegacyRecord(record, 1);

    expect(result.associate.fullName).toBe('JOÃO SILVA');
    expect(result.associate.sex).toBe('M');
    expect(result.associate.maritalStatus).toBe('casado');
    expect(result.associate.birthState).toBe('RJ');
    expect(result.associate.addressState).toBe('RJ');
    expect(result.associate.rgState).toBe('RJ');
    expect(result.associate.ceocMember).toBe(false);
    expect(result.associate.caocMember).toBe(true);
    expect(result.associate.associationStatus).toBe('ativo');
    expect(result.associate.careerOrigin).toBe('brasil');
    expect(result.associate.missionType).toBe('permanente');
    expect(result.associate.functionalStatus).toBe('ativo');
    expect(result.dependents).toHaveLength(2);
    expect(result.healthAgreements).toEqual(['SINDITAMARATY']);
  });

  it('maps AC sentinel to null in all UF fields', () => {
    const record = { UF: 'AC', UF_2: 'AC', UF_3: 'AC' } as Record<string, string>;
    const result = transformLegacyRecord(record, 1);
    expect(result.associate.birthState).toBeNull();
    expect(result.associate.rgState).toBeNull();
    expect(result.associate.addressState).toBeNull();
  });

  it('maps dash sentinel to null across fields (fullName gets NOT NULL fallback)', () => {
    const record = { Nome: '-', 'E-mail': '-', Telefone: '-' } as Record<string, string>;
    const result = transformLegacyRecord(record, 1);
    expect(result.associate.fullName).toBe('(sem nome)'); // NOT NULL constraint fallback
    expect(result.associate.primaryEmail).toBeNull();
    expect(result.associate.phone).toBeNull();
  });
});