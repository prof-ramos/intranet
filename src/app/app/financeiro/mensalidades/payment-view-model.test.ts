import { describe, expect, it } from 'vitest';
import { toPaymentIsoString, getEditorInitialValues } from './payment-view-model';
import type { Payment } from './payment-view-model';

const basePayment: Payment = {
  associateId: 1,
  fullName: 'Oficial Teste',
  defaultPaymentMethod: 'pix',
  paymentId: 10,
  paymentStatus: 'pago',
  monthPaymentMethod: 'pix',
  locationCountry: 'Brasil',
  locationCity: 'Brasília',
  functionalStatus: 'ativo',
  updatedAt: new Date('2026-05-13T00:00:00.000Z'),
  paidAt: new Date('2026-05-10T03:00:00.000Z'),
  amount: '150.00',
  paymentOrigin: 'comprovante',
  notes: null,
};

describe('toPaymentIsoString', () => {
  it('serializes Date instances', () => {
    expect(toPaymentIsoString(new Date('2026-05-13T00:00:00.000Z'))).toBe(
      '2026-05-13T00:00:00.000Z',
    );
  });

  it('accepts ISO strings from Data Cache round-trip', () => {
    expect(toPaymentIsoString('2026-05-13T00:00:00.000Z')).toBe('2026-05-13T00:00:00.000Z');
  });

  it('returns null for empty values', () => {
    expect(toPaymentIsoString(null)).toBeNull();
    expect(toPaymentIsoString(undefined)).toBeNull();
    expect(toPaymentIsoString('')).toBeNull();
  });
});

describe('getEditorInitialValues', () => {
  it('builds expectedUpdatedAt from string updatedAt without throwing', () => {
    const values = getEditorInitialValues({
      ...basePayment,
      updatedAt: '2026-05-13T00:00:00.000Z',
    });
    expect(values.expectedUpdatedAt).toBe('2026-05-13T00:00:00.000Z');
  });
});
