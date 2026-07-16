import { describe, expect, it } from 'vitest';
import { mmToPoints, pointsToMm } from '../measurements';

describe('measurements conversions', () => {
  describe('mmToPoints', () => {
    it('converts 0 mm to 0 points', () => {
      expect(mmToPoints(0)).toBe(0);
    });

    it('converts 25.4 mm (1 inch) to 72 points', () => {
      expect(mmToPoints(25.4)).toBeCloseTo(72, 4);
    });

    it('converts 1 mm to approx 2.8346 points', () => {
      expect(mmToPoints(1)).toBeCloseTo(2.834645669, 5);
    });
  });

  describe('pointsToMm', () => {
    it('converts 0 points to 0 mm', () => {
      expect(pointsToMm(0)).toBe(0);
    });

    it('converts 72 points to 25.4 mm (1 inch)', () => {
      expect(pointsToMm(72)).toBeCloseTo(25.4, 4);
    });

    it('converts 1 point to approx 0.3527 mm', () => {
      expect(pointsToMm(1)).toBeCloseTo(0.3527777, 5);
    });
  });
});
