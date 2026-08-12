/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MonthNavigator from './MonthNavigator';
import MonthlyPaymentsTable from './MonthlyPaymentsTable';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  updatePaymentAction: vi.fn(),
  cancelPaymentAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./actions', () => ({
  updatePaymentAction: mocks.updatePaymentAction,
  cancelPaymentAction: mocks.cancelPaymentAction,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const payment = {
  associateId: 7,
  fullName: 'João da Silva',
  defaultPaymentMethod: 'boleto' as const,
  paymentId: 10,
  paymentStatus: 'pendente' as const,
  monthPaymentMethod: null,
  locationCountry: 'Brasil',
  locationCity: 'Brasília',
  functionalStatus: 'ativo' as const,
  updatedAt: null,
};

const props = {
  payments: [payment],
  year: 2026,
  month: 1,
  currentFilters: { q: '', page: 1 } as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updatePaymentAction.mockResolvedValue({ success: true });
  mocks.cancelPaymentAction.mockResolvedValue({ success: true });
});

afterEach(() => cleanup());

describe('MonthlyPaymentsTable', () => {
  it('does not expose Cancelado as a direct status transition', () => {
    render(<MonthlyPaymentsTable {...props} />);
    const statusSelects = screen.getAllByRole('combobox', {
      name: 'Alterar status de João da Silva',
    });
    expect(statusSelects).toHaveLength(2);
    statusSelects.forEach((statusSelect) => {
      expect(statusSelect.querySelector('option[value="cancelado"]')).toBeNull();
    });
  });

  it('opens the audited cancellation dialog and submits the reason', async () => {
    render(<MonthlyPaymentsTable {...props} />);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Cancelar mensalidade de João da Silva' })[0],
    );
    expect(screen.getByRole('dialog', { name: 'Cancelar mensalidade' })).toBeDefined();

    fireEvent.change(screen.getByRole('textbox', { name: 'Motivo do cancelamento' }), {
      target: { value: 'Duplicidade' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    await waitFor(() =>
      expect(mocks.cancelPaymentAction).toHaveBeenCalledWith({
        paymentId: 10,
        year: 2026,
        month: 1,
        reason: 'Duplicidade',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('clears the local search state when filters are cleared', () => {
    render(<MonthlyPaymentsTable {...props} currentFilters={{ q: 'João', page: 1 }} />);
    const searchInput = screen.getByRole('textbox', { name: 'Buscar associado por nome' });
    expect(searchInput).toHaveProperty('value', 'João');

    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(searchInput).toHaveProperty('value', '');
    expect(mocks.push).toHaveBeenCalledWith('/app/financeiro/mensalidades?year=2026&month=1');
  });

  it('does not let a pending search restore the previous month', () => {
    vi.useFakeTimers();
    render(
      <>
        <MonthNavigator year={2026} month={1} currentFilters={props.currentFilters} />
        <MonthlyPaymentsTable {...props} />
      </>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar associado por nome' }), {
      target: { value: 'João' },
    });
    fireEvent.input(screen.getByLabelText('Selecionar mês'), { target: { value: '2026-02' } });

    act(() => vi.advanceTimersByTime(400));

    expect(mocks.push).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith('/app/financeiro/mensalidades?year=2026&month=2');
    vi.useRealTimers();
  });
});
