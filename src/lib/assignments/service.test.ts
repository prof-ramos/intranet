import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkAssignmentDuplicate,
  createAssignment,
  toggleAssignmentActive,
  updateAssignment,
} from './service';
import {
  findAssignmentById,
  findAssignmentByName,
  insertAssignment,
  toggleAssignmentActive as toggleAssignmentActiveRepo,
  updateAssignment as updateAssignmentRepo,
} from './repository';

const transactionMock = vi.hoisted(() => ({ tx: { __tx: true } }));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(transactionMock.tx),
    ),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  },
}));

vi.mock('./repository', () => ({
  findAssignmentById: vi.fn(),
  findAssignmentByName: vi.fn(),
  insertAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  toggleAssignmentActive: vi.fn(),
}));

describe('assignments service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAssignmentDuplicate', () => {
    it('returns exists: false when no assignment found by name', async () => {
      vi.mocked(findAssignmentByName).mockResolvedValue(null);

      const result = await checkAssignmentDuplicate('Embaixada em Paris');

      expect(result).toEqual({ exists: false });
    });

    it('returns exists: true with existingId when a different assignment uses the name', async () => {
      vi.mocked(findAssignmentByName).mockResolvedValue({ id: 5 });

      const result = await checkAssignmentDuplicate('SERE');

      expect(result).toEqual({ exists: true, existingId: 5 });
    });

    it('returns exists: false when the only match is the excluded id (self-update)', async () => {
      vi.mocked(findAssignmentByName).mockResolvedValue({ id: 5 });

      const result = await checkAssignmentDuplicate('SERE', 5);

      expect(result).toEqual({ exists: false });
    });

    it('returns exists: true when the match id differs from the excluded id', async () => {
      vi.mocked(findAssignmentByName).mockResolvedValue({ id: 7 });

      const result = await checkAssignmentDuplicate('SERE', 5);

      expect(result).toEqual({ exists: true, existingId: 7 });
    });
  });

  describe('createAssignment', () => {
    it('creates assignment and returns success when name is unique', async () => {
      vi.mocked(findAssignmentByName).mockResolvedValue(null);
      vi.mocked(insertAssignment).mockResolvedValue({ id: 42 });

      const db = await import('@/lib/db');
      const txInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
      vi.mocked(db.db.transaction).mockImplementationOnce(async (cb) =>
        cb({ ...transactionMock.tx, insert: txInsert } as never),
      );

      const result = await createAssignment({ name: 'Embaixada em Paris', type: 'exterior' }, 7);

      expect(result).toEqual({
        success: true,
        message: 'Lotação "Embaixada em Paris" criada com sucesso.',
      });
      expect(insertAssignment).toHaveBeenCalledWith(
        { name: 'Embaixada em Paris', type: 'exterior' },
        expect.anything(),
      );
    });

    it('returns failure when assignment name is already taken', async () => {
      vi.mocked(findAssignmentByName).mockResolvedValue({ id: 3 });

      const result = await createAssignment({ name: 'SERE', type: 'nacional' }, 7);

      expect(result).toEqual({
        success: false,
        message: 'Já existe uma lotação com este nome.',
      });
      expect(insertAssignment).not.toHaveBeenCalled();
    });
  });

  describe('updateAssignment', () => {
    it('returns failure when assignment does not exist', async () => {
      vi.mocked(findAssignmentById).mockResolvedValue(null);

      const result = await updateAssignment({ id: 999, name: 'X', type: 'nacional' }, 7);

      expect(result).toEqual({ success: false, message: 'Lotação não encontrada.' });
      expect(updateAssignmentRepo).not.toHaveBeenCalled();
    });

    it('returns failure when new name conflicts with another assignment', async () => {
      vi.mocked(findAssignmentById).mockResolvedValue({
        id: 9,
        name: 'Atual',
        type: 'nacional',
        isActive: true,
      });
      vi.mocked(findAssignmentByName).mockResolvedValue({ id: 12 });

      const result = await updateAssignment({ id: 9, name: 'Posto duplicado', type: 'exterior' }, 7);

      expect(result).toEqual({
        success: false,
        message: 'Já existe uma lotação com este nome.',
      });
      expect(updateAssignmentRepo).not.toHaveBeenCalled();
    });

    it('updates assignment and returns success when valid', async () => {
      vi.mocked(findAssignmentById).mockResolvedValue({
        id: 9,
        name: 'Atual',
        type: 'nacional',
        isActive: true,
      });
      vi.mocked(findAssignmentByName).mockResolvedValue(null);
      vi.mocked(updateAssignmentRepo).mockResolvedValue(undefined);

      const db = await import('@/lib/db');
      const txInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
      vi.mocked(db.db.transaction).mockImplementationOnce(async (cb) =>
        cb({ ...transactionMock.tx, insert: txInsert } as never),
      );

      const result = await updateAssignment({ id: 9, name: 'Novo Nome', type: 'exterior' }, 7);

      expect(result).toEqual({
        success: true,
        message: 'Lotação "Novo Nome" atualizada com sucesso.',
      });
      expect(updateAssignmentRepo).toHaveBeenCalledWith(
        9,
        { name: 'Novo Nome', type: 'exterior' },
        expect.anything(),
      );
    });
  });

  describe('toggleAssignmentActive', () => {
    it('deactivates an active assignment and returns success', async () => {
      vi.mocked(toggleAssignmentActiveRepo).mockResolvedValue({
        name: 'Consulado em Lisboa',
        isActive: false,
      });

      const db = await import('@/lib/db');
      const txInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
      vi.mocked(db.db.transaction).mockImplementationOnce(async (cb) =>
        cb({ ...transactionMock.tx, insert: txInsert } as never),
      );

      const result = await toggleAssignmentActive(4, 7);

      expect(result).toEqual({
        success: true,
        message: 'Lotação "Consulado em Lisboa" foi desativada com sucesso.',
      });
    });

    it('activates an inactive assignment and returns success', async () => {
      vi.mocked(toggleAssignmentActiveRepo).mockResolvedValue({
        name: 'SERE',
        isActive: true,
      });

      const db = await import('@/lib/db');
      const txInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
      vi.mocked(db.db.transaction).mockImplementationOnce(async (cb) =>
        cb({ ...transactionMock.tx, insert: txInsert } as never),
      );

      const result = await toggleAssignmentActive(2, 7);

      expect(result).toEqual({
        success: true,
        message: 'Lotação "SERE" foi ativada com sucesso.',
      });
    });

    it('returns failure when assignment is not found', async () => {
      vi.mocked(toggleAssignmentActiveRepo).mockRejectedValue(
        new Error('Lotação com id 999 não encontrada'),
      );

      const db = await import('@/lib/db');
      const txInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
      vi.mocked(db.db.transaction).mockImplementationOnce(async (cb) =>
        cb({ ...transactionMock.tx, insert: txInsert } as never),
      );

      const result = await toggleAssignmentActive(999, 7);

      expect(result).toEqual({ success: false, message: 'Lotação não encontrada.' });
    });

    it('rethrows unexpected errors', async () => {
      vi.mocked(toggleAssignmentActiveRepo).mockRejectedValue(new Error('DB connection lost'));

      const db = await import('@/lib/db');
      const txInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
      vi.mocked(db.db.transaction).mockImplementationOnce(async (cb) =>
        cb({ ...transactionMock.tx, insert: txInsert } as never),
      );

      await expect(toggleAssignmentActive(1, 7)).rejects.toThrow('DB connection lost');
    });
  });
});
