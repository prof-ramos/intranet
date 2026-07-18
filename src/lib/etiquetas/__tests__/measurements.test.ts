import { describe, expect, it } from 'vitest';
import { mmToPoints, pointsToMm } from '../measurements';

describe('conversões de medidas', () => {
  describe('mmToPoints', () => {
    it('converte zero milímetros em zero pontos', () => {
      expect(mmToPoints(0)).toBe(0);
    });

    it('converte uma polegada em 72 pontos', () => {
      expect(mmToPoints(25.4)).toBeCloseTo(72, 4);
    });

    it('converte um milímetro em aproximadamente 2,8346 pontos', () => {
      expect(mmToPoints(1)).toBeCloseTo(2.834645669, 5);
    });
  });

  describe('pointsToMm', () => {
    it('converte zero pontos em zero milímetros', () => {
      expect(pointsToMm(0)).toBe(0);
    });

    it('converte 72 pontos em uma polegada', () => {
      expect(pointsToMm(72)).toBeCloseTo(25.4, 4);
    });

    it('converte um ponto em aproximadamente 0,3528 milímetros', () => {
      expect(pointsToMm(1)).toBeCloseTo(0.3527777, 5);
    });
  });
});
