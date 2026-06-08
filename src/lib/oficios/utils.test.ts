import { describe, it, expect } from 'vitest';
import { cleanSignatoryName, checkImpersonality } from './utils';

describe('cleanSignatoryName', () => {
  it('removes cargo after em dash', () => {
    expect(cleanSignatoryName('João Silva — Presidente')).toBe('João Silva');
  });

  it('removes cargo after hyphen', () => {
    expect(cleanSignatoryName('Maria - VP')).toBe('Maria');
  });

  it('removes cargo after en dash', () => {
    expect(cleanSignatoryName('José Santos – Diretor')).toBe('José Santos');
  });

  it('returns full name when no separator', () => {
    expect(cleanSignatoryName('João')).toBe('João');
  });

  it('handles multiple separators', () => {
    expect(cleanSignatoryName('Ana — — Teste')).toBe('Ana');
  });

  it('trims whitespace', () => {
    expect(cleanSignatoryName('  João Silva  ')).toBe('João Silva');
  });
});

describe('checkImpersonality', () => {
  it('returns empty array for impersonal text', () => {
    expect(checkImpersonality('Solicita-se o envio da documentação.')).toEqual([]);
  });

  it('detects "eu"', () => {
    const warnings = checkImpersonality('Eu solicito o documento.');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].term).toBe('"eu"');
  });

  it('detects "meu"', () => {
    const warnings = checkImpersonality('Meu departamento solicita.');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].term).toBe('"meu"');
  });

  it('detects "minha"', () => {
    const warnings = checkImpersonality('Minha solicitação é...');
    expect(warnings).toHaveLength(1);
  });

  it('detects "tipo assim"', () => {
    const warnings = checkImpersonality('Tipo assim, precisamos fazer.');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].term).toBe('"tipo assim"');
  });

  it('detects "meio que"', () => {
    const warnings = checkImpersonality('Meio que precisamos resolver.');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].term).toBe('"meio que"');
  });

  it('detects multiple issues', () => {
    const warnings = checkImpersonality('Eu e meu colega tipo assim fizemos.');
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });

  it('does not duplicate same term', () => {
    const warnings = checkImpersonality('Eu fiz. Eu quis.');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].term).toBe('"eu"');
  });
});
