// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickAdd } from './_board/QuickAdd';
import type { Status } from './_board/types';
import { AtividadesBoard } from './AtividadesBoard';

const actionMocks = vi.hoisted(() => ({
  createQuickActivityAction: vi.fn(),
  routerReplace: vi.fn(),
  updateActivityAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/atividades',
  useRouter: () => ({ replace: actionMocks.routerReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (result: { destination: null }) => void;
  }) => (
    <>
      <button type="button" onClick={() => onDragEnd({ destination: null })}>
        Cancelar arraste
      </button>
      {children}
    </>
  ),
}));
vi.mock('./actions', () => ({
  createQuickActivityAction: actionMocks.createQuickActivityAction,
  getActivityTimelineAction: vi.fn(),
  updateActivityAction: actionMocks.updateActivityAction,
}));
vi.mock('./_board/useBoardPreferences', () => ({
  useBoardPreferences: () => ({
    compact: false,
    collapsedDone: false,
    setCompact: vi.fn(),
    setCollapsedDone: vi.fn(),
  }),
}));
vi.mock('./_board/BoardColumn', () => ({
  BoardColumn: ({
    col,
    handleAdd,
    openDrawer,
  }: {
    col: { key: 'a_fazer' | 'em_andamento' | 'aguardando_terceiros' | 'concluido' };
    handleAdd: (title: string, status: Status) => Promise<void>;
    openDrawer: (activityId: number) => void;
  }) =>
    col.key === 'a_fazer' ? (
      <>
        <QuickAdd columnKey="a_fazer" onAdd={handleAdd} />
        <button type="button" onClick={() => openDrawer(7)}>
          Abrir atividade
        </button>
      </>
    ) : null,
}));
vi.mock('./_board/Drawer', () => ({ Drawer: () => null }));
vi.mock('./_board/FilterBar', () => ({ FilterBar: () => null }));
vi.mock('./_board/SummaryStrip', () => ({
  SummaryStrip: ({ onLateClick }: { onLateClick: () => void }) => (
    <button type="button" onClick={onLateClick}>
      Filtrar atrasadas
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AtividadesBoard quick add', () => {
  it('wires late filtering, drawer opening, and cancelled drag interactions', async () => {
    render(
      <AtividadesBoard
        initialActivities={[]}
        people={[{ id: 1, name: 'Dev', role: 'admin' }]}
        associates={[]}
        currentUser={{ id: 1, name: 'Dev', role: 'admin' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar atrasadas' }));
    await waitFor(() =>
      expect(actionMocks.routerReplace).toHaveBeenCalledWith(expect.stringContaining('dueLate=1'), {
        scroll: false,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir atividade' }));
    expect(actionMocks.routerReplace).toHaveBeenCalledWith(expect.stringContaining('open=7'), {
      scroll: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar arraste' }));
    expect(actionMocks.updateActivityAction).not.toHaveBeenCalled();
  });

  it('closes the editor after the activity is created successfully', async () => {
    actionMocks.createQuickActivityAction.mockResolvedValueOnce({
      id: 7,
      title: 'TESTE',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      dueDate: null,
      completedAt: null,
      assigneeId: 1,
      assigneeName: 'Dev',
      associateId: null,
      associateName: null,
      tags: [],
      dueOffset: null,
    });
    render(
      <AtividadesBoard
        initialActivities={[]}
        people={[{ id: 1, name: 'Dev', role: 'admin' }]}
        associates={[]}
        currentUser={{ id: 1, name: 'Dev', role: 'admin' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Título da nova atividade' }), {
      target: { value: 'TESTE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Título da nova atividade' })).toBeNull(),
    );
    expect(actionMocks.createQuickActivityAction).toHaveBeenCalledWith({
      title: 'TESTE',
      status: 'a_fazer',
    });
  });

  it('keeps the editor open with its title when creation fails', async () => {
    actionMocks.createQuickActivityAction.mockRejectedValueOnce(new Error('Falha de criação'));
    render(
      <AtividadesBoard
        initialActivities={[]}
        people={[{ id: 1, name: 'Dev', role: 'admin' }]}
        associates={[]}
        currentUser={{ id: 1, name: 'Dev', role: 'admin' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    const editor = screen.getByRole('textbox', { name: 'Título da nova atividade' });
    fireEvent.change(editor, { target: { value: 'TESTE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(screen.getByText('Falha de criação')).toBeTruthy());
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Título da nova atividade',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('TESTE');
  });
});
