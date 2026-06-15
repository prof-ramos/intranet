import { describe, expect, it } from 'vitest';
import { toPortugueseTitleCase } from './portuguese-title-case';

describe('toPortugueseTitleCase', () => {
  it('title-cases a simple word', () => {
    expect(toPortugueseTitleCase('brasil')).toBe('Brasil');
  });

  it('lowercases connector words after the first word', () => {
    expect(toPortugueseTitleCase('costa do marfim')).toBe('Costa do Marfim');
    expect(toPortugueseTitleCase('estados unidos da américa')).toBe(
      'Estados Unidos da América',
    );
    expect(toPortugueseTitleCase('reino das maldivas')).toBe(
      'Reino das Maldivas',
    );
    expect(toPortugueseTitleCase('republica dos tchecos')).toBe(
      'Republica dos Tchecos',
    );
  });

  it('does not lowercase connector word when it is the first word', () => {
    // First word is always title-cased regardless of being a connector
    expect(toPortugueseTitleCase('da costa')).toBe('Da Costa');
    expect(toPortugueseTitleCase('de la france')).toBe('De La France');
  });

  it('handles the connector "e"', () => {
    expect(toPortugueseTitleCase('trinidad e tobago')).toBe(
      'Trinidad e Tobago',
    );
  });

  it('handles hyphenated words', () => {
    expect(toPortugueseTitleCase('guiné-bissau')).toBe('Guiné-Bissau');
  });

  it('handles empty and whitespace-only strings', () => {
    expect(toPortugueseTitleCase('')).toBe('');
    expect(toPortugueseTitleCase('   ')).toBe('');
  });

  it('handles already title-cased input', () => {
    expect(toPortugueseTitleCase('Brasil')).toBe('Brasil');
    expect(toPortugueseTitleCase('Costa do Marfim')).toBe('Costa do Marfim');
  });

  it('handles all-uppercase input', () => {
    expect(toPortugueseTitleCase('ESTADOS UNIDOS DA AMÉRICA')).toBe(
      'Estados Unidos da América',
    );
  });

  it('handles single-character word', () => {
    expect(toPortugueseTitleCase('e')).toBe('E');
  });

  it('handles mixed case with accents', () => {
    expect(toPortugueseTitleCase("côte d'ivoire")).toBe("Côte D'ivoire");
  });
});