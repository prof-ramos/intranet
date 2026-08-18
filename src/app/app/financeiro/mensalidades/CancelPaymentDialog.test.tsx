/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CancelPaymentDialog from './CancelPaymentDialog';

afterEach(() => cleanup());

describe('CancelPaymentDialog', () => {
  it('does not render while closed and focuses the reason field when opened', async () => {
    const { rerender } = render(
      <CancelPaymentDialog
        associateName="João da Silva"
        open={false}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      <CancelPaymentDialog
        associateName="João da Silva"
        open
        isPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Cancelar mensalidade' })).toBeDefined();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Motivo do cancelamento' }),
      ),
    );
  });

  it('requires a reason with at least three characters', () => {
    const onConfirm = vi.fn();
    render(
      <CancelPaymentDialog
        associateName="João da Silva"
        open
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(screen.getByRole('alert').textContent).toContain('ao menos 3 caracteres');
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do cancelamento' }), {
      target: { value: 'ok' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(screen.getByRole('alert').textContent).toContain('ao menos 3 caracteres');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('submits the trimmed reason and closes on escape', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <CancelPaymentDialog
        associateName="João da Silva"
        open
        isPending={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do cancelamento' }), {
      target: { value: '  Lançamento em duplicidade  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(onConfirm).toHaveBeenCalledWith('Lançamento em duplicidade');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows server errors and locks destructive actions while pending', () => {
    const onClose = vi.fn();
    render(
      <CancelPaymentDialog
        associateName="João da Silva"
        open
        isPending
        errorMessage="Esta mensalidade já está cancelada."
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('já está cancelada');
    expect(screen.getByRole('textbox', { name: 'Motivo do cancelamento' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: 'Cancelando…' })).toHaveProperty('disabled', true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the responsive design-system targets for dialog actions', () => {
    render(
      <CancelPaymentDialog
        associateName="João da Silva"
        open
        isPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Fechar cancelamento' }).className).toContain(
      'min-h-10',
    );
    expect(screen.getByRole('button', { name: 'Manter registro' }).className).toContain('min-h-11');
    expect(screen.getByRole('button', { name: 'Confirmar cancelamento' }).className).toContain(
      'min-h-11',
    );
  });

  it('contains tab focus and restores the invoking control on close', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const { rerender } = render(
      <CancelPaymentDialog
        associateName="João da Silva"
        open
        isPending={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Motivo do cancelamento' }),
      ),
    );
    const closeButton = screen.getByRole('button', { name: 'Fechar cancelamento' });
    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Confirmar cancelamento' }),
    );

    rerender(
      <CancelPaymentDialog
        associateName="João da Silva"
        open={false}
        isPending={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });
});
