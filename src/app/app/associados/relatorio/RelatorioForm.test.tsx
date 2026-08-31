/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RelatorioForm } from './RelatorioForm';

const countMock = vi.hoisted(() =>
  vi.fn(async (_filters: Record<string, string>) => ({ count: 12 })),
);

vi.mock('./actions', () => ({
  countReportAssociatesAction: countMock,
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  countMock.mockReset();
  countMock.mockResolvedValue({ count: 12 });
});

function renderForm() {
  const view = render(<RelatorioForm />);
  expect(screen.getByRole('heading', { name: 'Filtros' })).toBeDefined();
  return view;
}

async function waitForOfficialsCount(pattern: RegExp) {
  await waitFor(
    () => {
      expect(screen.getByText(pattern)).toBeDefined();
    },
    { timeout: 5_000 },
  );
}

describe('RelatorioForm', () => {
  it('marks sensitive fields as dado pessoal in the checkbox name', async () => {
    await renderForm();

    expect(screen.getByRole('checkbox', { name: 'CPF dado pessoal' })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'UF RG' })).toBeDefined();
    expect(screen.queryByRole('checkbox', { name: /UF RG.*dado pessoal/ })).toBeNull();
  });

  it('keeps the manifesto live region in sync with fields, PII and recorte', async () => {
    await renderForm();
    await waitForOfficialsCount(/12 oficiais no recorte/);

    const manifesto = document.querySelector('[aria-live="polite"]');
    expect(manifesto).not.toBeNull();
    expect(manifesto?.textContent).toMatch(/12 oficiais no recorte/);
    expect(manifesto?.textContent).toMatch(/0 campos/);
    expect(manifesto?.textContent).toMatch(/0 dados pessoais/);

    fireEvent.click(screen.getByRole('checkbox', { name: 'CPF dado pessoal' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'UF RG' }));

    expect(manifesto?.textContent).toMatch(/2 campos/);
    expect(manifesto?.textContent).toMatch(/1 dado pessoal/);
    expect(screen.getByRole('button', { name: 'Baixar CSV' })).not.toHaveProperty('disabled', true);
  });

  it('updates the officials count when filters change', async () => {
    countMock.mockImplementation(async (filters) => ({
      count: filters.functionalStatus === 'ativo' ? 4 : 12,
    }));
    await renderForm();
    await waitForOfficialsCount(/12 oficiais no recorte/);

    fireEvent.change(screen.getByRole('combobox', { name: /situação funcional/i }), {
      target: { value: 'ativo' },
    });

    await waitForOfficialsCount(/4 oficiais no recorte/);
    expect(countMock).toHaveBeenCalledWith(expect.objectContaining({ functionalStatus: 'ativo' }));
  });

  it('shows an ellipsis while the recorte count is loading', async () => {
    let resolveCount: (value: { count: number }) => void = () => {};
    countMock.mockImplementation(
      () =>
        new Promise<{ count: number }>((resolve) => {
          resolveCount = resolve;
        }),
    );

    render(<RelatorioForm />);
    expect(screen.getByText(/Oficiais no recorte …/)).toBeDefined();
    await waitFor(() => expect(countMock).toHaveBeenCalled(), { timeout: 5_000 });
    resolveCount({ count: 8 });
    await waitForOfficialsCount(/8 oficiais no recorte/);
  });

  it('separates clearing fields from clearing filters and has no third Limpar', async () => {
    await renderForm();

    fireEvent.click(screen.getByRole('checkbox', { name: 'CPF dado pessoal' }));
    fireEvent.change(screen.getByRole('combobox', { name: /contribuição/i }), {
      target: { value: 'inadimplente' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar campos' }));
    expect(
      (screen.getByRole('checkbox', { name: 'CPF dado pessoal' }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByRole('combobox', { name: /contribuição/i }) as HTMLSelectElement).value,
    ).toBe('inadimplente');

    fireEvent.click(screen.getByRole('checkbox', { name: 'CPF dado pessoal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(
      (screen.getByRole('combobox', { name: /contribuição/i }) as HTMLSelectElement).value,
    ).toBe('todos');
    expect(
      (screen.getByRole('checkbox', { name: 'CPF dado pessoal' }) as HTMLInputElement).checked,
    ).toBe(true);

    expect(screen.queryByRole('button', { name: 'Limpar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpar seleção' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Limpar tudo' })).toBeNull();
  });

  it('renders filters before the field groups', async () => {
    await renderForm();
    const filtros = screen.getByRole('heading', { name: 'Filtros' });
    const dados = screen.getByText('Dados pessoais');
    expect(filtros.compareDocumentPosition(dados) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not stretch field cards to the tallest column', async () => {
    const { container } = await renderForm();
    expect(container.querySelector('.lg\\:grid-cols-3')?.className).toContain('items-start');
  });

  it('uses a native square checkbox without DaisyUI radio styling', async () => {
    await renderForm();
    const checkbox = screen.getByRole('checkbox', { name: 'CPF dado pessoal' });
    expect(checkbox.getAttribute('class')).not.toMatch(/\bcheckbox\b/);
    expect(checkbox.getAttribute('readonly')).toBeNull();
    expect(checkbox.getAttribute('aria-readonly')).toBeNull();
    expect(checkbox.className).toContain('rounded-[3px]');
  });

  it('renders enum filter labels from the field registry', async () => {
    await renderForm();
    expect(screen.getByRole('option', { name: 'Em dia' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Em licença' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Pix' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Folha de pagamento' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Em Dia' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'PIX' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Folha' })).toBeNull();
  });

  it('keeps Baixar CSV disabled until a field is selected', async () => {
    await renderForm();
    const submit = screen.getByRole('button', { name: 'Baixar CSV' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByText('Selecione ao menos um campo para baixar o CSV.')).toBeDefined();

    fireEvent.click(screen.getByRole('checkbox', { name: /^Nome$/ }));
    expect(submit.disabled).toBe(false);
  });
});
