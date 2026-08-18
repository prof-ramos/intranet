import { beforeEach, describe, expect, it, vi } from 'vitest';

const findActivitiesMock = vi.fn();
const findActiveAdminsMock = vi.fn();
const findActiveAssociatesMock = vi.fn();
const findActivityBoardRowByIdMock = vi.fn();
const mapActivityRowToBoardActivityMock = vi.fn();

vi.mock('./repository', () => ({
  findActivities: (...args: unknown[]) => findActivitiesMock(...args),
  findActiveAdmins: (...args: unknown[]) => findActiveAdminsMock(...args),
  findActiveAssociates: (...args: unknown[]) => findActiveAssociatesMock(...args),
  findActivityBoardRowById: (...args: unknown[]) => findActivityBoardRowByIdMock(...args),
  mapActivityRowToBoardActivity: (...args: unknown[]) => mapActivityRowToBoardActivityMock(...args),
}));

import { buildPeopleList, getActivitiesBoardData, getActivitiesFormData } from './queries';

describe('activities queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findActivitiesMock.mockResolvedValue([]);
    findActiveAdminsMock.mockResolvedValue([]);
    findActiveAssociatesMock.mockResolvedValue([]);
    findActivityBoardRowByIdMock.mockResolvedValue(null);
    mapActivityRowToBoardActivityMock.mockImplementation((row: unknown) => row);
  });

  it('preserves the authenticated current user when admin rows include the same id', () => {
    const result = buildPeopleList({ userId: 7, name: 'Sessao Atual', role: 'diretoria' }, [
      { id: 7, name: 'Registro Antigo', role: 'admin' },
      { id: 9, name: 'Outra Pessoa', role: 'secretaria' },
    ]);

    expect(result.currentUser).toEqual({
      id: 7,
      name: 'Sessao Atual',
      role: 'diretoria',
    });
    expect(result.people).toEqual([
      { id: 7, name: 'Sessao Atual', role: 'diretoria' },
      { id: 9, name: 'Outra Pessoa', role: 'secretaria' },
    ]);
  });

  it('builds board data with mapped activities and deduped people', async () => {
    findActivitiesMock.mockResolvedValue([{ id: 1, title: 'Atividade' }]);
    findActiveAdminsMock.mockResolvedValue([
      { id: 7, name: 'Registro Antigo', role: 'admin' },
      { id: 8, name: 'Maria', role: 'admin' },
    ]);
    findActiveAssociatesMock.mockResolvedValue([{ id: 20, name: 'Associado' }]);
    mapActivityRowToBoardActivityMock.mockReturnValue({ id: 1, title: 'Mapeada' });

    const result = await getActivitiesBoardData(
      { userId: 7, name: 'Sessao Atual', role: 'diretoria' },
      { limit: 10, offset: 5 },
    );

    expect(findActivitiesMock).toHaveBeenCalledWith({
      limit: 10,
      offset: 5,
      dueLate: undefined,
      openOnly: undefined,
    });
    expect(result).toEqual({
      initialActivities: [{ id: 1, title: 'Mapeada' }],
      people: [
        { id: 7, name: 'Sessao Atual', role: 'diretoria' },
        { id: 8, name: 'Maria', role: 'admin' },
      ],
      associates: [{ id: 20, name: 'Associado' }],
      currentUser: { id: 7, name: 'Sessao Atual', role: 'diretoria' },
    });
  });

  it('builds form data with the same deduped people contract', async () => {
    findActiveAdminsMock.mockResolvedValue([
      { id: 7, name: 'Registro Antigo', role: 'admin' },
      { id: 8, name: 'Maria', role: 'admin' },
    ]);
    findActiveAssociatesMock.mockResolvedValue([{ id: 20, name: 'Associado' }]);

    const result = await getActivitiesFormData({
      userId: 7,
      name: 'Sessao Atual',
      role: 'diretoria',
    });

    expect(result).toEqual({
      people: [
        { id: 7, name: 'Sessao Atual', role: 'diretoria' },
        { id: 8, name: 'Maria', role: 'admin' },
      ],
      associates: [{ id: 20, name: 'Associado' }],
      currentUser: { id: 7, name: 'Sessao Atual', role: 'diretoria' },
    });
  });

  it('includes a deep-linked activity that is outside the board window', async () => {
    findActivitiesMock.mockResolvedValue([{ id: 1, title: 'Recente' }]);
    findActivityBoardRowByIdMock.mockResolvedValue({ id: 999, title: 'Vencida antiga' });
    mapActivityRowToBoardActivityMock.mockImplementation((row: unknown) => row);

    const result = await getActivitiesBoardData(
      { userId: 7, name: 'Sessao Atual', role: 'admin' },
      { openActivityId: 999 },
    );

    expect(findActivityBoardRowByIdMock).toHaveBeenCalledWith(999);
    expect(result.initialActivities).toEqual([
      { id: 1, title: 'Recente' },
      { id: 999, title: 'Vencida antiga' },
    ]);
  });

  it('forwards operational dashboard filters to the repository', async () => {
    await getActivitiesBoardData(
      { userId: 7, name: 'Sessao Atual', role: 'admin' },
      { dueLate: true, openOnly: false },
    );

    expect(findActivitiesMock).toHaveBeenCalledWith({
      limit: undefined,
      offset: undefined,
      dueLate: true,
      openOnly: false,
    });
  });
});
