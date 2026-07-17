/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CriarAssociadoForm } from '../novo/CriarAssociadoForm';
import { EditarAssociadoForm } from '../[id]/editar/EditarAssociadoForm';
import { createAssociateFormValues } from './AssociateFormFields';

const { createAssociate, updateAssociate } = vi.hoisted(() => ({
  createAssociate: vi.fn(),
  updateAssociate: vi.fn(),
}));

vi.mock('@/app/app/associados/actions', () => ({
  createAssociate,
  updateAssociate,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: () => null,
  Save: () => null,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn() }),
}));

type EditAssociate = ComponentProps<typeof EditarAssociadoForm>['associate'];

const editAssociate: EditAssociate = {
  ...createAssociateFormValues,
  id: 42,
};

function renderedForm(): HTMLFormElement {
  const form = document.querySelector('form');
  if (!(form instanceof HTMLFormElement)) throw new Error('Form not rendered');
  return form;
}

function entriesWithout(data: FormData, omittedNames: string[]) {
  return [...data.entries()].filter(([name]) => !omittedNames.includes(name));
}

afterEach(cleanup);

beforeEach(() => {
  createAssociate.mockReset().mockResolvedValue(undefined);
  updateAssociate.mockReset().mockResolvedValue(undefined);
});

describe('associate form wrappers', () => {
  it('preserves create section order and keeps dependents out of edit', () => {
    const { unmount } = render(<CriarAssociadoForm canEditInternalNotes />);

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Identificação',
      'Endereço',
      'Dados Profissionais',
      'Administrativo',
      'Dependentes',
      'Observações internas',
    ]);
    expect(renderedForm().elements.namedItem('id')).toBeNull();
    expect(renderedForm().elements.namedItem('dependentName')).not.toBeNull();

    unmount();
    render(<EditarAssociadoForm associate={editAssociate} canEditInternalNotes />);

    expect(screen.queryByRole('heading', { name: 'Dependentes' })).toBeNull();
    expect(renderedForm().elements.namedItem('id')).not.toBeNull();
    expect(renderedForm().elements.namedItem('dependentName')).toBeNull();
  });

  it('submits equivalent shared FormData plus only the wrapper-specific fields', async () => {
    const { unmount } = render(<CriarAssociadoForm canEditInternalNotes />);
    const createForm = renderedForm();
    const createData = new FormData(createForm);

    fireEvent.submit(createForm);
    await waitFor(() => expect(createAssociate).toHaveBeenCalledTimes(1));
    expect([...createAssociate.mock.calls[0][0].entries()]).toEqual([...createData.entries()]);

    unmount();
    render(<EditarAssociadoForm associate={editAssociate} canEditInternalNotes />);
    const editForm = renderedForm();
    const editData = new FormData(editForm);

    fireEvent.submit(editForm);
    await waitFor(() => expect(updateAssociate).toHaveBeenCalledTimes(1));
    expect([...updateAssociate.mock.calls[0][0].entries()]).toEqual([...editData.entries()]);
    expect(entriesWithout(createData, ['dependentName', 'dependentRelationship'])).toEqual(
      entriesWithout(editData, ['id']),
    );
    expect(editData.get('id')).toBe('42');
  });
});
