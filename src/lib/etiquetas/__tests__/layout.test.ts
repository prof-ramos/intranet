import { describe, expect, it } from 'vitest';
import { calculateLabelPosition, calculateLabelPositions, getPimacoTemplate } from '@/lib/etiquetas';

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

  it('valida startPosition', () => {
    expect(() => calculateLabelPosition(template, 0, { startPosition: 0 })).toThrow('posição inicial');
  });
});

describe('calculateLabelPositions', () => {
  const template = getPimacoTemplate('A4256');

  it('calcula posições para múltiplas etiquetas', () => {
    const count = 3;
    const positions = calculateLabelPositions(template, count);

    expect(positions).toHaveLength(3);

    // Verifica se os índices estão corretos (sequenciais)
    expect(positions[0]?.pageIndex).toBe(0);
    expect(positions[0]?.column).toBe(0);
    expect(positions[0]?.row).toBe(0);

    expect(positions[1]?.pageIndex).toBe(0);
    expect(positions[1]?.column).toBe(1);
    expect(positions[1]?.row).toBe(0);

    expect(positions[2]?.pageIndex).toBe(0);
    expect(positions[2]?.column).toBe(2);
    expect(positions[2]?.row).toBe(0);
  });

  it('repassa as opções corretamente (ex: startPosition)', () => {
    const count = 2;
    // Inicia na segunda posição (index 1 base 0)
    const positions = calculateLabelPositions(template, count, { startPosition: 2 });

    expect(positions).toHaveLength(2);

    // O primeiro elemento gerado deve estar na posição de coluna 1
    expect(positions[0]?.column).toBe(1);
    expect(positions[0]?.row).toBe(0);

    // O segundo elemento gerado deve estar na posição de coluna 2
    expect(positions[1]?.column).toBe(2);
    expect(positions[1]?.row).toBe(0);
  });

  it('rejeita startPosition fora dos limites do template', () => {
    expect(() => calculateLabelPositions(template, 1, { startPosition: 0 })).toThrow(
      'A posição inicial deve estar entre 1 e 33.'
    );
    expect(() => calculateLabelPositions(template, 1, { startPosition: 34 })).toThrow(
      'A posição inicial deve estar entre 1 e 33.'
    );
  });

  it('aceita os limites válidos de startPosition', () => {
    expect(calculateLabelPositions(template, 1, { startPosition: 1 })[0]?.indexOnPage).toBe(0);
    expect(calculateLabelPositions(template, 1, { startPosition: 33 })[0]?.indexOnPage).toBe(32);
  });
});
