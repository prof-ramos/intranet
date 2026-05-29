import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findByNameMock,
  findByIdMock,
  insertMock,
  updateByIdMock,
  setActiveMock,
  logAuditMock,
} = vi.hoisted(() => ({
  findByNameMock: vi.fn(),
  findByIdMock: vi.fn(),
  insertMock: vi.fn(),
  updateByIdMock: vi.fn(),
  setActiveMock: vi.fn(),
  logAuditMock: vi.fn(),
}));

vi.mock('./repository', () => ({
  findAssignmentByName: (...args: unknown[]) => findByNameMock(...args),
  findAssignmentById: (...args: unknown[]) => findByIdMock(...args),
  insertAssignment: (...args: unknown[]) => insertMock(...args),
  updateAssignmentById: (...args: unknown[]) => updateByIdMock(...args),
  setAssignmentActive: (...args: unknown[]) => setActiveMock(...args),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: (...args: unknown[]) => logAuditMock(...args),
}));

describe('assignments service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAssignment', () => {
    it('creates assignment and logs audit', async () => {
      findByNameMock.mockResolvedValue(null);
      insertMock.mockResolvedValue({ id: 21 });
      logAuditMock.mockResolvedValue(undefined);

      const { createAssignment } = await import('./service');
      const result = await createAssignment('Embaixada em Paris', 'exterior', 7);

      expect(result).toEqual({ id: 21 });
      expect(findByNameMock).toHaveBeenCalledWith('Embaixada em Paris');
      expect(insertMock).toHaveBeenCalledWith({ name: 'Embaixada em Paris', type: 'exterior' });
      expect(logAuditMock).toHaveBeenCalledWith({
        adminId: 7,
        action: 'assignment_created',
        entityType: 'assignment',
        entityId: 21,
        changes: { old: {}, new: { name: 'Embaixada em Paris', type: 'exterior' } },
      });
    });

    it('throws DuplicateAssignmentNameError when name exists', async () => {
      findByNameMock.mockResolvedValue({ id: 3 });

      const { createAssignment, DuplicateAssignmentNameError } = await import('./service');
      await expect(createAssignment('SERE', 'nacional', 7)).rejects.toThrow(
        DuplicateAssignmentNameError,
      );
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  describe('updateAssignment', () => {
    it('updates assignment and logs audit with old/new values', async () => {
      findByIdMock.mockResolvedValue({ id: 9, name: 'Atual', type: 'nacional', isActive: true });
      findByNameMock.mockResolvedValue(null);
      updateByIdMock.mockResolvedValue(undefined);
      logAuditMock.mockResolvedValue(undefined);

      const { updateAssignment } = await import('./service');
      await updateAssignment(9, 'Novo Nome', 'exterior', 7);

      expect(updateByIdMock).toHaveBeenCalledWith(9, { name: 'Novo Nome', type: 'exterior' });
      expect(logAuditMock).toHaveBeenCalledWith({
        adminId: 7,
        action: 'assignment_updated',
        entityType: 'assignment',
        entityId: 9,
        changes: {
          old: { name: 'Atual', type: 'nacional' },
          new: { name: 'Novo Nome', type: 'exterior' },
        },
      });
    });

    it('throws AssignmentNotFoundError when target does not exist', async () => {
      findByIdMock.mockResolvedValue(null);

      const { updateAssignment, AssignmentNotFoundError } = await import('./service');
      await expect(updateAssignment(999, 'X', 'nacional', 7)).rejects.toThrow(
        AssignmentNotFoundError,
      );
    });

    it('throws DuplicateAssignmentNameError when another record uses the name', async () => {
      findByIdMock.mockResolvedValue({ id: 9, name: 'Atual', type: 'nacional', isActive: true });
      findByNameMock.mockResolvedValue({ id: 12 });

      const { updateAssignment, DuplicateAssignmentNameError } = await import('./service');
      await expect(updateAssignment(9, 'Posto duplicado', 'exterior', 7)).rejects.toThrow(
        DuplicateAssignmentNameError,
      );
      expect(updateByIdMock).not.toHaveBeenCalled();
    });
  });

  describe('toggleAssignmentActive', () => {
    it('toggles active state and logs audit', async () => {
      findByIdMock.mockResolvedValue({ id: 4, name: 'Consulado em Lisboa', isActive: true });
      setActiveMock.mockResolvedValue(undefined);
      logAuditMock.mockResolvedValue(undefined);

      const { toggleAssignmentActive } = await import('./service');
      const result = await toggleAssignmentActive(4, 7);

      expect(result).toEqual({ name: 'Consulado em Lisboa', newState: false });
      expect(setActiveMock).toHaveBeenCalledWith(4, false);
      expect(logAuditMock).toHaveBeenCalledWith({
        adminId: 7,
        action: 'assignment_deactivated',
        entityType: 'assignment',
        entityId: 4,
      });
    });

    it('throws AssignmentNotFoundError when target does not exist', async () => {
      findByIdMock.mockResolvedValue(null);

      const { toggleAssignmentActive, AssignmentNotFoundError } = await import('./service');
      await expect(toggleAssignmentActive(999, 7)).rejects.toThrow(AssignmentNotFoundError);
    });
  });
});
