// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReassignModal } from './ReassignModal';

afterEach(() => {
  cleanup();
});

describe('ReassignModal', () => {
  it('prevents a duplicate reassignment while the submitted action is pending', async () => {
    let resolveSubmission!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmission = resolve;
        }),
    );

    render(
      <ReassignModal
        activity={{ id: 7, title: 'Organizar resposta', assigneeId: 1 }}
        people={[
          { id: 1, name: 'Responsável atual', role: 'admin' },
          { id: 2, name: 'Nova responsável', role: 'secretaria' },
        ]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reatribuir' }));

    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Reatribuindo...' }) as HTMLButtonElement).disabled,
      ).toBe(true),
    );
    expect(onSubmit).toHaveBeenCalledWith(2, '');

    resolveSubmission();

    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Reatribuir' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
  });
});
