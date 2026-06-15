import { describe, expect, it } from 'vitest';
import { getLabelsPerPage, getPimacoTemplate, mmToPoints } from '@/lib/etiquetas';

describe('templates Pimaco', () => {
  it('converte milímetros para pontos', () => {
    expect(mmToPoints(25.4)).toBeCloseTo(72, 5);
  });

  it('resolve modelo válido e etiquetas por página', () => {
    const template = getPimacoTemplate('6182');
    expect(template.code).toBe('6182');
    expect(getLabelsPerPage(template)).toBe(16);
  });

  it('rejeita modelo inexistente', () => {
    expect(() => getPimacoTemplate('9999' as '6182')).toThrow('Modelo Pimaco');
  });
});
