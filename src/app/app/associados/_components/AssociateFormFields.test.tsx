/**
 * @vitest-environment jsdom
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AssociateFormFields,
  createAssociateFormValues,
  type AssociateFormValues,
} from './AssociateFormFields';

function formDataFor(
  mode: 'create' | 'edit',
  values: AssociateFormValues,
  canEditInternalNotes = true,
) {
  const { container } = render(
    <form>
      <AssociateFormFields
        values={values}
        mode={mode}
        canEditInternalNotes={canEditInternalNotes}
      />
    </form>,
  );
  const form = container.querySelector('form');
  if (!form) throw new Error('Form not rendered');
  return {
    data: Object.fromEntries(new FormData(form).entries()),
    document,
  };
}

afterEach(cleanup);

describe('AssociateFormFields', () => {
  it('serializes create defaults without edit-only id or unchecked checkboxes', () => {
    const { data, document } = formDataFor('create', createAssociateFormValues);

    expect(data).toMatchObject({
      fullName: '',
      associationStatus: 'nao_associado',
      contributionStatus: 'inadimplente',
      paymentMethod: 'folha',
      internalNotes: '',
    });
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('ceocMember');
    expect(data).not.toHaveProperty('caocMember');
    expect(document.querySelectorAll('[name="fullName"]')).toHaveLength(1);
    expect(document.querySelector('select[name="associationStatus"] option[value=""]')).toBeNull();
  });

  it('serializes edit values and checked membership fields', () => {
    const values: AssociateFormValues = {
      ...createAssociateFormValues,
      fullName: 'Ana Oficial',
      cpf: '123.456.789-00',
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      paymentMethod: 'pix',
      ceocMember: true,
      caocMember: true,
      internalNotes: 'Somente equipe autorizada',
    };
    const { data, document } = formDataFor('edit', values);

    expect(data).toMatchObject({
      fullName: 'Ana Oficial',
      cpf: '123.456.789-00',
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      paymentMethod: 'pix',
      ceocMember: 'true',
      caocMember: 'true',
      internalNotes: 'Somente equipe autorizada',
    });
    expect(
      document.querySelector('select[name="associationStatus"] option[value=""]'),
    ).not.toBeNull();
  });

  it('omits internal notes when the user lacks permission', () => {
    const { data, document } = formDataFor('edit', createAssociateFormValues, false);

    expect(data).not.toHaveProperty('internalNotes');
    expect(document.querySelector('[name="internalNotes"]')).toBeNull();
  });
});
