import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAssignment, toggleAssignmentActive, updateAssignment } from './actions';

const {
  requireRoleMock,
  revalidatePathMock,
  revalidateTagMock,
  mockLimit,
  mockReturning,
  mockInsertValues,
  selectQueue,
  insertQueue,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  mockLimit: vi.fn(async () => selectQueue.shift() ?? []),
  mockReturning: vi.fn(),
  mockInsertValues: vi.fn(() => insertQueue.shift()),
  mockUpdateWhere: vi.fn().mockResolvedValue(undefined),
  selectQueue: [] as unknown[][],
  insertQueue: [] as unknown[],
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockLimit,
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: mockInsertValues,
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: mockUpdateWhere,
      })),
    })),
    transaction: vi.fn(async (cb) => await cb(mockDb)),
  };

  return {
    db: mockDb,
  };
});

describe('config lotacoes actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    insertQueue.length = 0;
    requireRoleMock.mockResolvedValue({ userId: 7 });
    mockReturning.mockResolvedValue([{ id: 21 }]);
    mockInsertValues.mockImplementation(() => insertQueue.shift());
    mockLimit.mockImplementation(async () => selectQueue.shift() ?? []);
  });

  it('creates an assignment, writes an audit log, and revalidates', async () => {
    selectQueue.push([]);
    insertQueue.push({ returning: mockReturning }, undefined);

    const formData = new FormData();
    formData.set('name', 'Embaixada em Paris');
    formData.set('type', 'exterior');

    const result = await createAssignment(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Lotação "Embaixada em Paris" criada com sucesso.',
    });
    expect(mockReturning).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, {
      name: 'Embaixada em Paris',
      type: 'exterior',
    });
    expect(mockInsertValues).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: 'assignment_created',
        entityType: 'assignment',
        entityId: 21,
        performedBy: 7,
      }),
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/lotacoes');
  });

  it('returns a friendly message when a concurrent request wins the UNIQUE constraint race', async () => {
    const pgError = Object.assign(new Error('unique violation'), { code: '23505' });
    selectQueue.push([]); // passes the app-level duplicate check
    insertQueue.push({ returning: mockReturning });
    mockReturning.mockRejectedValueOnce(pgError);

    const formData = new FormData();
    formData.set('name', 'Embaixada em Paris');
    formData.set('type', 'exterior');

    const result = await createAssignment(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Já existe uma lotação com este nome.',
    });
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rejects duplicate assignment names before inserting', async () => {
    selectQueue.push([{ id: 3 }]);

    const formData = new FormData();
    formData.set('name', 'SERE');
    formData.set('type', 'nacional');

    const result = await createAssignment(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Já existe uma lotação com este nome.',
    });
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('rejects duplicate names on update when another record already uses them', async () => {
    selectQueue.push([{ id: 9, name: 'Atual', type: 'nacional' }], [{ id: 12 }]);

    const formData = new FormData();
    formData.set('id', '9');
    formData.set('name', 'Posto duplicado');
    formData.set('type', 'exterior');

    const result = await updateAssignment(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Já existe uma lotação com este nome.',
    });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rejects non-decimal assignment ids on update and toggle', async () => {
    const updateFormData = new FormData();
    updateFormData.set('id', '1e2');
    updateFormData.set('name', 'Posto X');
    updateFormData.set('type', 'exterior');

    await expect(updateAssignment(null, updateFormData)).resolves.toEqual({
      success: false,
      message: 'Lotação inválida.',
    });

    const toggleFormData = new FormData();
    toggleFormData.set('id', '0x10');

    await expect(toggleAssignmentActive(null, toggleFormData)).resolves.toEqual({
      success: false,
      message: 'Lotação inválida.',
    });

    expect(mockUpdateWhere).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('toggles assignment active state, writes an audit log, and revalidates', async () => {
    selectQueue.push([{ id: 4, name: 'Consulado em Lisboa', isActive: true }]);
    insertQueue.push(undefined);

    const formData = new FormData();
    formData.set('id', '4');

    const result = await toggleAssignmentActive(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Lotação "Consulado em Lisboa" foi desativada com sucesso.',
    });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'assignment_deactivated',
        entityType: 'assignment',
        entityId: 4,
        performedBy: 7,
      }),
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/lotacoes');
  });
});
