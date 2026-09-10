// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';
import type {
  ActivityCommentItem,
  ActivityLabelItem,
  ActivityTimelineItem,
  BoardActivity,
  BoardPerson,
} from './types';

vi.mock('../actions', () => ({
  addCommentAction: vi.fn(),
  deleteCommentAction: vi.fn(),
  editCommentAction: vi.fn(),
  addLabelAction: vi.fn(),
  removeLabelAction: vi.fn(),
}));

vi.mock('@/lib/ui/tokens', () => ({
  buttonOutlineBorder: '#000',
  buttonOutlineHoverBg: '#eee',
  canvas: '#fff',
  dangerText: '#b42318',
  drawerShadow: '0 0 0 1px #000',
  focusRingClass: '',
  hairline: '#e5e5e5',
  inputBg: '#fff',
  overlayScrim: 'rgba(0,0,0,0.5)',
  priorityStyles: {
    baixa: { label: 'Baixa', fg: '#000', bg: '#eee' },
    normal: { label: 'Normal', fg: '#000', bg: '#eee' },
    alta: { label: 'Alta', fg: '#000', bg: '#eee' },
    urgente: { label: 'Urgente', fg: '#000', bg: '#eee' },
  },
  statusStyles: {
    a_fazer: { label: 'A fazer', accent: '#000' },
    em_andamento: { label: 'Em andamento', accent: '#000' },
    aguardando_terceiros: { label: 'Aguardando terceiros', accent: '#000' },
    concluido: { label: 'Concluído', accent: '#000' },
  },
  textFaint: '#999',
  textMuted: '#666',
  textPrimary: '#111',
  textSecondary: '#333',
}));

vi.mock('@/hooks/use-escape-key', () => ({ useEscapeKey: vi.fn() }));
vi.mock('./ActivityCard', () => ({ Avatar: () => null }));
vi.mock('./constants', () => ({
  columns: [
    { key: 'a_fazer', title: 'A fazer' },
    { key: 'em_andamento', title: 'Em andamento' },
    { key: 'aguardando_terceiros', title: 'Aguardando terceiros' },
    { key: 'concluido', title: 'Concluído' },
  ],
  safeColorToken: (token: string) => token,
}));

const activity: BoardActivity = {
  id: 12,
  title: 'Atividade de teste',
  description: 'Descrição',
  status: 'a_fazer',
  priority: 'normal',
  dueDate: null,
  completedAt: null,
  assigneeId: null,
  assigneeName: null,
  associateId: null,
  associateName: null,
  tags: [],
  labels: [],
  dueOffset: null,
};

const comment: ActivityCommentItem = {
  id: 7,
  activityId: 12,
  authorAdminId: 3,
  content: 'Comentário do autor',
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
};

function renderDrawer(currentUserId: number, activityOverride?: Partial<BoardActivity>) {
  return render(
    <Drawer
      activity={{ ...activity, ...activityOverride }}
      people={[]}
      peopleById={new Map<number, BoardPerson>()}
      timeline={[] as ActivityTimelineItem[]}
      timelineLoading={false}
      timelineError={null}
      comments={[comment]}
      commentsLoading={false}
      commentsError={null}
      currentUserId={currentUserId}
      availableLabels={[] as ActivityLabelItem[]}
      labelsLoading={false}
      labelsError={null}
      onClose={vi.fn()}
      onChange={vi.fn()}
      onRequestReassign={vi.fn()}
      onCommentsChange={vi.fn()}
      onCommentMutation={vi.fn()}
      onLabelsChange={vi.fn()}
      onLabelMutation={vi.fn()}
    />,
  );
}

describe('Drawer comment actions', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('hides edit and delete buttons for a comment authored by another user', () => {
    renderDrawer(8);
    expect(screen.queryByRole('button', { name: 'Editar comentário' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir comentário' })).toBeNull();
  });

  it('shows edit and delete buttons for the comment author', () => {
    renderDrawer(3);
    expect(screen.getByRole('button', { name: 'Editar comentário' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Excluir comentário' })).toBeTruthy();
  });

  it('resets the comment draft and editing state when the activity changes', () => {
    const { rerender } = renderDrawer(3);
    const textarea = screen.getByRole('textbox', {
      name: 'Novo comentário',
    }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'rascunho' } });
    expect(textarea.value).toBe('rascunho');

    rerender(
      <Drawer
        activity={{ ...activity, id: 13 }}
        people={[]}
        peopleById={new Map<number, BoardPerson>()}
        timeline={[] as ActivityTimelineItem[]}
        timelineLoading={false}
        timelineError={null}
        comments={[comment]}
        commentsLoading={false}
        commentsError={null}
        currentUserId={3}
        availableLabels={[] as ActivityLabelItem[]}
        labelsLoading={false}
        labelsError={null}
        onClose={vi.fn()}
        onChange={vi.fn()}
        onRequestReassign={vi.fn()}
        onCommentsChange={vi.fn()}
        onCommentMutation={vi.fn()}
        onLabelsChange={vi.fn()}
        onLabelMutation={vi.fn()}
      />,
    );

    expect(
      (screen.getByRole('textbox', { name: 'Novo comentário' }) as HTMLTextAreaElement).value,
    ).toBe('');
  });
});