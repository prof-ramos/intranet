import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAssignment, toggleAssignmentActive, updateAssignment } from './actions';

const {
  requireRoleMock,
  revalidatePathMock,
  createAssignmentMock,
  updateAssignmentMock,
  toggleAssignmentActiveMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  createAssignmentMock: vi.fn(),
  updateAssignmentMock: vi.fn(),
  toggleAssignmentActiveMock: vi.fn(),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock('@/lib/assignments/service', () => ({
  createAssignment: (...args: unknown[]) => createAssignmentMock(...args),
  updateAssignment: (...args: unknown[]) => updateAssignmentMock(...args),
  toggleAssignmentActive: (...args: unknown[]) => toggleAssignmentActiveMock(...args),
  AssignmentNotFoundError: class AssignmentNotFoundError extends Error {
    constructor() {
      super('Lotação não encontrada.');
      this.name = 'AssignmentNotFoundError';
    }
  },
  DuplicateAssignmentNameError: class DuplicateAssignmentNameError extends Error {
    constructor() {
      super('Já existe uma lotação com este nome.');
      this.name = 'DuplicateAssignmentNameError';
    }
  },
}));

describe('config lotacoes actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    createAssignmentMock.mockResolvedValue({ id: 21 });
    updateAssignmentMock.mockResolvedValue(undefined);
    toggleAssignmentActiveMock.mockResolvedValue({ name: 'Consulado em Lisboa', newState: false });
  });

  it('creates an assignment, revalidates, and returns success', async () => {
    const formData = new FormData();
    formData.set('name', 'Embaixada em Paris');
    formData.set('type', 'exterior');

    const result = await createAssignment(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Lotação "Embaixada em Paris" criada com sucesso.',
    });
    expect(createAssignmentMock).toHaveBeenCalledWith('Embaixada em Paris', 'exterior', 7);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/lotacoes');
  });

  it('rejects duplicate assignment names before inserting', async () => {
    const { DuplicateAssignmentNameError } = await import('@/lib/assignments/service');
    createAssignmentMock.mockRejectedValue(new DuplicateAssignmentNameError());

    const formData = new FormData();
    formData.set('name', 'SERE');
    formData.set('type', 'nacional');

    const result = await createAssignment(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Já existe uma lotação com este nome.',
    });
  });

  it('rejects duplicate names on update when another record already uses them', async () => {
    const { DuplicateAssignmentNameError } = await import('@/lib/assignments/service');
    updateAssignmentMock.mockRejectedValue(new DuplicateAssignmentNameError());

    const formData = new FormData();
    formData.set('id', '9');
    formData.set('name', 'Posto duplicado');
    formData.set('type', 'exterior');

    const result = await updateAssignment(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Já existe uma lotação com este nome.',
    });
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

    expect(updateAssignmentMock).not.toHaveBeenCalled();
    expect(toggleAssignmentActiveMock).not.toHaveBeenCalled();
  });

  it('toggles assignment active state and revalidates', async () => {
    toggleAssignmentActiveMock.mockResolvedValue({ name: 'Consulado em Lisboa', newState: false });

    const formData = new FormData();
    formData.set('id', '4');

    const result = await toggleAssignmentActive(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Lotação "Consulado em Lisboa" foi desativada com sucesso.',
    });
    expect(toggleAssignmentActiveMock).toHaveBeenCalledWith(4, 7);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/lotacoes');
  });
});
