import { describe, expect, it } from 'vitest';
import {
  createDependentSchema,
  updateDependentSchema,
  deleteDependentSchema,
  createHealthAgreementSchema,
  updateHealthAgreementSchema,
  deleteHealthAgreementSchema,
} from './schemas';

describe('createDependentSchema', () => {
  it('validates a valid dependent', () => {
    const result = createDependentSchema.safeParse({
      associateId: '1',
      name: 'Maria Silva',
      relationship: 'filha',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.associateId).toBe(1);
      expect(result.data.name).toBe('Maria Silva');
      expect(result.data.relationship).toBe('filha');
    }
  });

  it('rejects missing name', () => {
    const result = createDependentSchema.safeParse({
      associateId: '1',
      name: '',
      relationship: 'filha',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing relationship', () => {
    const result = createDependentSchema.safeParse({
      associateId: '1',
      name: 'Maria',
      relationship: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing associateId', () => {
    const result = createDependentSchema.safeParse({
      name: 'Maria',
      relationship: 'filha',
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name and relationship', () => {
    const result = createDependentSchema.safeParse({
      associateId: '1',
      name: '  Maria Silva  ',
      relationship: '  filha  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Maria Silva');
      expect(result.data.relationship).toBe('filha');
    }
  });
});

describe('updateDependentSchema', () => {
  it('validates partial update with name only', () => {
    const result = updateDependentSchema.safeParse({
      id: '1',
      name: 'Maria Santos',
    });
    expect(result.success).toBe(true);
  });

  it('validates partial update with relationship only', () => {
    const result = updateDependentSchema.safeParse({
      id: '1',
      relationship: 'conjuge',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name in update', () => {
    const result = updateDependentSchema.safeParse({
      id: '1',
      name: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteDependentSchema', () => {
  it('validates a valid id and associateId', () => {
    const result = deleteDependentSchema.safeParse({ id: '42', associateId: '1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(42);
      expect(result.data.associateId).toBe(1);
    }
  });

  it('rejects non-numeric id', () => {
    const result = deleteDependentSchema.safeParse({ id: 'abc', associateId: '1' });
    expect(result.success).toBe(false);
  });

  it('rejects missing associateId', () => {
    const result = deleteDependentSchema.safeParse({ id: '42' });
    expect(result.success).toBe(false);
  });
});

describe('createHealthAgreementSchema', () => {
  it('validates a valid health agreement with all fields', () => {
    const result = createHealthAgreementSchema.safeParse({
      associateId: '1',
      provider: 'SINDITAMARATY',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.associateId).toBe(1);
      expect(result.data.provider).toBe('SINDITAMARATY');
      expect(result.data.startDate).toBe('2024-01-01');
    }
  });

  it('validates without dates', () => {
    const result = createHealthAgreementSchema.safeParse({
      associateId: '1',
      provider: 'AMIL',
    });
    expect(result.success).toBe(true);
  });

  it('validates with null dates', () => {
    const result = createHealthAgreementSchema.safeParse({
      associateId: '1',
      provider: 'AMIL',
      startDate: null,
      endDate: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing provider', () => {
    const result = createHealthAgreementSchema.safeParse({
      associateId: '1',
      provider: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createHealthAgreementSchema.safeParse({
      associateId: '1',
      provider: 'AMIL',
      startDate: '01/01/2024',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateHealthAgreementSchema', () => {
  it('validates partial update with provider only', () => {
    const result = updateHealthAgreementSchema.safeParse({
      id: '1',
      provider: 'ASBAC',
    });
    expect(result.success).toBe(true);
  });

  it('validates partial update with dates', () => {
    const result = updateHealthAgreementSchema.safeParse({
      id: '1',
      startDate: '2024-06-01',
      endDate: '2025-05-31',
    });
    expect(result.success).toBe(true);
  });
});

describe('deleteHealthAgreementSchema', () => {
  it('validates a valid id and associateId', () => {
    const result = deleteHealthAgreementSchema.safeParse({ id: '5', associateId: '1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(5);
      expect(result.data.associateId).toBe(1);
    }
  });

  it('rejects missing associateId', () => {
    const result = deleteHealthAgreementSchema.safeParse({ id: '5' });
    expect(result.success).toBe(false);
  });
});