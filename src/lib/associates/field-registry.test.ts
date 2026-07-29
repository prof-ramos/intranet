import { describe, expect, it } from 'vitest';
import { ASSOCIATE_FIELDS, getAssociateEnumOptions, getExportableFields } from './field-registry';
import { updateAssociateSchema } from '@/lib/validation/schemas';

const schemaKeys = Object.keys(updateAssociateSchema.shape).filter((key) => key !== 'id');
const registryKeys = ASSOCIATE_FIELDS.map((field) => field.key);

describe('ASSOCIATE_FIELDS', () => {
  it('covers every field of updateAssociateSchema (schema ⊆ registry)', () => {
    for (const key of schemaKeys) {
      expect(registryKeys).toContain(key);
    }
  });

  it('has no entries outside updateAssociateSchema (registry ⊆ schema)', () => {
    for (const key of registryKeys) {
      expect(schemaKeys).toContain(key);
    }
  });

  it('has no duplicate keys', () => {
    expect(new Set(registryKeys).size).toBe(registryKeys.length);
  });

  it('excludes internalNotes from export by explicit exportEligible: false, not omission', () => {
    const internalNotes = ASSOCIATE_FIELDS.find((field) => field.key === 'internalNotes');
    expect(internalNotes).toBeDefined();
    expect(internalNotes?.exportEligible).toBe(false);
  });
});

describe('getExportableFields', () => {
  it('excludes fields marked exportEligible: false', () => {
    const exportable = getExportableFields();
    expect(exportable.every((field) => field.exportEligible)).toBe(true);
    expect(exportable.some((field) => field.key === 'internalNotes')).toBe(false);
  });

  it('includes rgExpeditionDate', () => {
    expect(getExportableFields().some((field) => field.key === 'rgExpeditionDate')).toBe(true);
  });
});

describe('getAssociateEnumOptions', () => {
  it('exposes the canonical values and labels for form enum fields', () => {
    expect(getAssociateEnumOptions('functionalStatus')).toEqual([
      { value: 'ativo', label: 'Ativo' },
      { value: 'aposentado', label: 'Aposentado' },
      { value: 'cedido', label: 'Cedido' },
      { value: 'em_licenca', label: 'Em licença' },
    ]);
    expect(getAssociateEnumOptions('paymentMethod')).toEqual([
      { value: 'folha', label: 'Folha de pagamento' },
      { value: 'boleto', label: 'Boleto' },
      { value: 'pix', label: 'Pix' },
      { value: 'transferencia', label: 'Transferência' },
      { value: 'outros', label: 'Outros' },
    ]);
  });
});
