import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createActivity,
  createQuickActivityAction,
  getActivityTimelineAction,
  updateActivityAction,
} from './actions';

const requireRoleMock = vi.fn();
const createActivityServiceMock = vi.fn();
const updateActivityServiceMock = vi.fn();
const listActivityTimelineMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/activities/service', () => ({
  createActivityService: (...args: unknown[]) => createActivityServiceMock(...args),
  updateActivityService: (...args: unknown[]) => updateActivityServiceMock(...args),
}));

vi.mock('@/lib/activities/repository', () => ({
  listActivityTimeline: (...args: unknown[]) => listActivityTimelineMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

describe('atividades actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7, name: 'Admin', role: 'admin' });
    createActivityServiceMock.mockResolvedValue({ id: 99 });
    updateActivityServiceMock.mockResolvedValue({
      id: 99,
      status: 'concluido',
      priority: 'alta',
      dueDate: null,
      completedAt: new Date('2026-05-17T12:00:00.000Z'),
      assigneeId: 7,
    });
    listActivityTimelineMock.mockResolvedValue([]);
  });

  it('creates an activity from form data and revalidates the board', async () => {
    const formData = new FormData();
    formData.set('title', 'Nova atividade');
    formData.set('description', '  Descricao importante  ');
    formData.set('area', 'juridico');
    formData.set('status', 'a_fazer');
    formData.set('priority', 'alta');
    formData.set('assigneeId', '12');
    formData.set('associateId', '34');
    formData.set('dueDate', '2026-05-30');
    formData.set('tags', '["Urgente","juridico",""]');

    await createActivity(formData);

    expect(createActivityServiceMock).toHaveBeenCalledWith({
      title: 'Nova atividade',
      description: '  Descricao importante  ',
      status: 'a_fazer',
      priority: 'alta',
      assigneeId: 12,
      associateId: 34,
      dueDate: '2026-05-30',
      tags: ['juridico', 'Urgente', 'juridico'],
      createdBy: 7,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/atividades');
  });

  it('rejects invalid assignee ids instead of silently nulling them', async () => {
    const formData = new FormData();
    formData.set('title', 'Nova atividade');
    formData.set('assigneeId', 'abc');

    await expect(createActivity(formData)).rejects.toThrow('Responsável inválido.');
    expect(createActivityServiceMock).not.toHaveBeenCalled();
  });

  it('rejects non-decimal assignee ids', async () => {
    const formData = new FormData();
    formData.set('title', 'Nova atividade');
    formData.set('assigneeId', '1e2');

    await expect(createActivity(formData)).rejects.toThrow('Responsável inválido.');
    expect(createActivityServiceMock).not.toHaveBeenCalled();
  });

  it('rejects invalid associate ids instead of silently nulling them', async () => {
    const formData = new FormData();
    formData.set('title', 'Nova atividade');
    formData.set('associateId', '0');

    await expect(createActivity(formData)).rejects.toThrow('Associado inválido.');
    expect(createActivityServiceMock).not.toHaveBeenCalled();
  });

  it('rejects non-decimal associate ids', async () => {
    const formData = new FormData();
    formData.set('title', 'Nova atividade');
    formData.set('associateId', '0x10');

    await expect(createActivity(formData)).rejects.toThrow('Associado inválido.');
    expect(createActivityServiceMock).not.toHaveBeenCalled();
  });

  it('rejects non-string activity fields at the form boundary', async () => {
    const formData = new FormData();
    formData.set('title', new File(['bad'], 'title.txt'));

    await expect(createActivity(formData)).rejects.toThrow('Invalid input');
    expect(createActivityServiceMock).not.toHaveBeenCalled();
  });

  it('falls back to empty tags when the payload is malformed json', async () => {
    const formData = new FormData();
    formData.set('title', 'Nova atividade');
    formData.set('tags', '{bad json');

    await createActivity(formData);

    expect(createActivityServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [],
      }),
    );
  });

  it('creates a quick activity assigned to the authenticated user', async () => {
    createActivityServiceMock.mockResolvedValue({
      id: 51,
      title: 'Atalho rápido',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      dueDate: null,
      completedAt: null,
      assigneeId: 7,
      associateId: null,
      tags: [],
    });

    const result = await createQuickActivityAction({
      title: '  Atalho rápido  ',
      status: 'a_fazer',
    });

    expect(createActivityServiceMock).toHaveBeenCalledWith({
      title: 'Atalho rápido',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      assigneeId: 7,
      associateId: null,
      dueDate: null,
      tags: [],
      createdBy: 7,
    });
    expect(result).toEqual({
      id: 51,
      title: 'Atalho rápido',
      description: null,
      status: 'a_fazer',
      priority: 'normal',
      dueDate: null,
      completedAt: null,
      assigneeId: 7,
      assigneeName: 'Admin',
      associateId: null,
      associateName: null,
      tags: [],
      dueOffset: null,
    });
  });

  it('rejects an invalid quick activity status before calling the service', async () => {
    await expect(
      createQuickActivityAction({
        title: 'Atalho rápido',
        status: 'invalido' as never,
      }),
    ).rejects.toThrow('Status de atividade inválido.');

    expect(createActivityServiceMock).not.toHaveBeenCalled();
  });

  it('rejects oversized activity text and tag collections before persistence', async () => {
    const oversizedDescription = new FormData();
    oversizedDescription.set('title', 'Nova atividade');
    oversizedDescription.set('description', 'x'.repeat(10_001));

    await expect(createActivity(oversizedDescription)).rejects.toThrow('descrição');

    const tooManyTags = new FormData();
    tooManyTags.set('title', 'Nova atividade');
    tooManyTags.set('tags', JSON.stringify(Array.from({ length: 21 }, (_, index) => `tag-${index}`)));

    await expect(createActivity(tooManyTags)).rejects.toThrow('tags');

    await expect(
      createQuickActivityAction({ title: 'x'.repeat(256), status: 'a_fazer' }),
    ).rejects.toThrow('título');

    await expect(
      updateActivityAction({ id: 99, reassignmentMessage: 'x'.repeat(2_001) }),
    ).rejects.toThrow('mensagem');

    expect(createActivityServiceMock).not.toHaveBeenCalled();
    expect(updateActivityServiceMock).not.toHaveBeenCalled();
  });

  it('updates an activity through the server action and revalidates the board', async () => {
    const result = await updateActivityAction({
      id: 99,
      status: 'concluido',
      priority: 'alta',
      dueDate: null,
    });

    expect(result).toEqual({
      id: 99,
      status: 'concluido',
      priority: 'alta',
      dueDate: null,
      completedAt: '2026-05-17T12:00:00.000Z',
      assigneeId: 7,
    });
    expect(updateActivityServiceMock).toHaveBeenCalledWith({
      id: 99,
      actorId: 7,
      status: 'concluido',
      priority: 'alta',
      dueDate: null,
      assigneeId: undefined,
      reassignmentMessage: undefined,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/atividades');
  });

  it('rejects an invalid activity priority before calling the service', async () => {
    await expect(
      updateActivityAction({
        id: 99,
        priority: 'invalida' as never,
      }),
    ).rejects.toThrow('Prioridade de atividade inválida.');

    expect(updateActivityServiceMock).not.toHaveBeenCalled();
  });

  it('passes reassignment data through the update action', async () => {
    updateActivityServiceMock.mockResolvedValue({
      id: 99,
      status: 'em_andamento',
      priority: 'normal',
      dueDate: null,
      completedAt: null,
      assigneeId: 12,
    });

    const result = await updateActivityAction({
      id: 99,
      assigneeId: 12,
      reassignmentMessage: 'Assumir retorno com a diretoria',
    });

    expect(result).toEqual({
      id: 99,
      status: 'em_andamento',
      priority: 'normal',
      dueDate: null,
      completedAt: null,
      assigneeId: 12,
    });
    expect(updateActivityServiceMock).toHaveBeenCalledWith({
      id: 99,
      actorId: 7,
      status: undefined,
      priority: undefined,
      dueDate: undefined,
      assigneeId: 12,
      reassignmentMessage: 'Assumir retorno com a diretoria',
    });
  });

  it('maps activity audit entries into timeline items', async () => {
    listActivityTimelineMock.mockResolvedValue([
      {
        id: 1,
        action: 'activity_created',
        actorName: 'Admin',
        createdAt: new Date('2026-05-17T12:00:00.000Z'),
        changes: null,
      },
      {
        id: 2,
        action: 'activity_updated',
        actorName: 'Maria',
        createdAt: new Date('2026-05-17T13:00:00.000Z'),
        changes: {
          old: { status: 'a_fazer', priority: 'normal', dueDate: null },
          new: { status: 'concluido', priority: 'alta', dueDate: '2026-05-20T00:00:00.000Z' },
        },
      },
    ]);

    const result = await getActivityTimelineAction(9);

    expect(result).toEqual([
      {
        id: 1,
        action: 'activity_created',
        actorName: 'Admin',
        createdAt: '2026-05-17T12:00:00.000Z',
        summary: 'Atividade criada.',
      },
      {
        id: 2,
        action: 'activity_updated',
        actorName: 'Maria',
        createdAt: '2026-05-17T13:00:00.000Z',
        summary: 'Alterou status para Concluído, prioridade para Alta, vencimento atualizado.',
      },
    ]);
  });

  it('rejects an invalid timeline activity id before querying the repository', async () => {
    await expect(getActivityTimelineAction(0)).rejects.toThrow('Atividade inválida.');
    expect(listActivityTimelineMock).not.toHaveBeenCalled();
  });

  it('adds assignee changes to the timeline summary', async () => {
    listActivityTimelineMock.mockResolvedValue([
      {
        id: 3,
        action: 'activity_updated',
        actorName: 'Carlos',
        createdAt: new Date('2026-05-17T14:00:00.000Z'),
        changes: {
          old: { assigneeId: 7 },
          new: { assigneeId: 12 },
        },
      },
    ]);

    const result = await getActivityTimelineAction(9);

    expect(result[0]?.summary).toBe('Alterou responsável.');
  });
});
