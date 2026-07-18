/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EtiquetasRecipientsSelector } from './EtiquetasRecipientsSelector';

vi.mock('../actions', () => ({
  fetchAssociatesForEtiquetas: vi.fn().mockResolvedValue([]),
}));

const associate = {
  id: 42,
  nome: 'Maria da Silva',
  lotacao: 'Embaixada em Paris',
  cidade: 'Paris',
  uf: 'FR',
};

describe('EtiquetasRecipientsSelector', () => {
  afterEach(() => {
    cleanup();
  });

  it('identifica o checkbox e alterna a seleção ao clicar no texto da linha', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EtiquetasRecipientsSelector
        initialAssociates={[associate]}
        selectedIds={[]}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Maria da Silva Embaixada em Paris · Paris · FR',
      }),
    ).toBeDefined();

    fireEvent.click(screen.getByText('Maria da Silva'));
    expect(onChange).toHaveBeenLastCalledWith([42]);

    rerender(
      <EtiquetasRecipientsSelector
        initialAssociates={[associate]}
        selectedIds={[42]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText('Maria da Silva'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
