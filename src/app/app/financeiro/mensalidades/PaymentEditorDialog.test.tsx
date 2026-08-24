/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PaymentEditorDialog, { type PaymentEditorInitialValues } from './PaymentEditorDialog';

const initialValues: PaymentEditorInitialValues = {
  status: 'pendente',
  paymentMethod: 'boleto',
  amount: null,
  paidAt: null,
  paymentOrigin: 'comprovante',
  notes: null,
  expectedUpdatedAt: '2026-08-18T12:00:00.000Z',
};

afterEach(() => cleanup());

describe('PaymentEditorDialog', () => {
  it('exposes structured accessible fields and submits a valid paid record', () => {
    const onConfirm = vi.fn();
    render(
      <PaymentEditorDialog
        associateName="João da Silva"
        periodLabel="agosto de 2026"
        initialValues={initialValues}
        open
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Registrar pagamento' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Origem do pagamento' })).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Valor recebido' })).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Observações' })).toBeDefined();

    fireEvent.change(screen.getByRole('combobox', { name: 'Situação' }), {
      target: { value: 'pago' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Valor recebido' }), {
      target: { value: '123,45' },
    });
    fireEvent.change(screen.getByLabelText('Data do pagamento'), {
      target: { value: '2026-08-10' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Forma de pagamento' }), {
      target: { value: 'pix' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Origem do pagamento' }), {
      target: { value: 'comprovante' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Observações' }), {
      target: { value: 'Conferido no comprovante bancário' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pagamento' }));

    expect(onConfirm).toHaveBeenCalledWith({
      status: 'pago',
      paymentMethod: 'pix',
      amount: 123.45,
      paidAt: '2026-08-10',
      paymentOrigin: 'comprovante',
      notes: 'Conferido no comprovante bancário',
    });
  });

  it('requires value and date for paid records and rejects future dates', () => {
    const onConfirm = vi.fn();
    render(
      <PaymentEditorDialog
        associateName="João da Silva"
        periodLabel="agosto de 2026"
        initialValues={{ ...initialValues, status: 'pago' }}
        open
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salvar pagamento' }));
    expect(screen.getByRole('alert').textContent).toContain('valor maior que zero');
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Valor recebido' }), {
      target: { value: '10,00' },
    });
    fireEvent.change(screen.getByLabelText('Data do pagamento'), {
      target: { value: '2999-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pagamento' }));
    expect(screen.getByRole('alert').textContent).toContain('não pode estar no futuro');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows conflict feedback and locks the form while saving', () => {
    render(
      <PaymentEditorDialog
        associateName="João da Silva"
        periodLabel="agosto de 2026"
        initialValues={initialValues}
        open
        isPending
        errorMessage="Este lançamento foi alterado por outro usuário."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('alterado por outro usuário');
    expect(screen.getByRole('button', { name: 'Salvando…' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('combobox', { name: 'Origem do pagamento' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
