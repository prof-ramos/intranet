import { describe, expect, it } from 'vitest';
import { calculateLabelPosition, getPimacoTemplate } from '@/lib/etiquetas';

describe('layout de etiquetas', () => {
  const template = getPimacoTemplate('A4256');

  it('calcula linha e coluna', () => {
    const pos = calculateLabelPosition(template, 4, { startPosition: 1 });
    expect(pos.row).toBe(1);
    expect(pos.column).toBe(1);
    expect(pos.pageIndex).toBe(0);
  });

  it('quebra página', () => {
    const pos = calculateLabelPosition(template, 33, { startPosition: 1 });
    expect(pos.pageIndex).toBe(1);
    expect(pos.indexOnPage).toBe(0);
  });

  it('respeita startPosition base 1', () => {
    const pos = calculateLabelPosition(template, 0, { startPosition: 2 });
    expect(pos.indexOnPage).toBe(1);
    expect(pos.column).toBe(1);
  });

  it('aplica offsets', () => {
    const base = calculateLabelPosition(template, 0, { startPosition: 1 });
    const shifted = calculateLabelPosition(template, 0, { startPosition: 1, offsetXmm: 1, offsetYmm: 1 });
    expect(shifted.x).toBeGreaterThan(base.x);
    expect(shifted.y).toBeLessThan(base.y);
  });

  describe('validação de limites (boundary conditions) para startPosition', () => {
    it('deve lançar erro se startPosition for menor que 1', () => {
      expect(() => calculateLabelPosition(template, 0, { startPosition: 0 })).toThrow(
        'A posição inicial deve estar entre 1 e 33.'
      );
      expect(() => calculateLabelPosition(template, 0, { startPosition: -5 })).toThrow(
        'A posição inicial deve estar entre 1 e 33.'
      );
    });

    it('deve lançar erro se startPosition for maior que labelsPerPage', () => {
      expect(() => calculateLabelPosition(template, 0, { startPosition: 34 })).toThrow(
        'A posição inicial deve estar entre 1 e 33.'
      );
      expect(() => calculateLabelPosition(template, 0, { startPosition: 100 })).toThrow(
        'A posição inicial deve estar entre 1 e 33.'
      );
    });

    it('não deve lançar erro nos limites válidos (1 e labelsPerPage)', () => {
      expect(() => calculateLabelPosition(template, 0, { startPosition: 1 })).not.toThrow();
      expect(() => calculateLabelPosition(template, 0, { startPosition: 33 })).not.toThrow();
    });
  });
});
