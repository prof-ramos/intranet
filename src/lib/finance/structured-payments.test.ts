import { describe, expect, it } from 'vitest';
import {
  civilDateToBusinessInstant,
  validatePaymentAmount,
  validatePaymentDate,
  validatePaymentNotes,
} from './service';

describe('structured monthly payment values', () => {
  it('canonicalizes BRL without losing cents', () => {
    expect(validatePaymentAmount('1234,5')).toBe('1234.50');
    expect(validatePaymentAmount(null)).toBeNull();
    expect(() => validatePaymentAmount('0')).toThrow('maior que zero');
    expect(() => validatePaymentAmount('1.234')).toThrow('até 2 casas');
  });

  it('limits notes to the operational 2,000-character contract', () => {
    expect(validatePaymentNotes('  conferido no relatório  ')).toBe('conferido no relatório');
    expect(validatePaymentNotes('   ')).toBeNull();
    expect(() => validatePaymentNotes('x'.repeat(2001))).toThrow('2.000');
  });

  it('persists a civil date at midnight in America/Sao_Paulo', () => {
    expect(civilDateToBusinessInstant('2026-05-10').toISOString()).toBe('2026-05-10T03:00:00.000Z');
  });

  it('rejects a future civil date using the business clock', () => {
    const now = new Date('2026-05-10T12:00:00.000Z');
    expect(() => validatePaymentDate('2026-05-11', now)).toThrow('não pode ser futura');
    expect(validatePaymentDate('2026-05-10', now)?.toISOString()).toBe('2026-05-10T03:00:00.000Z');
  });
});
