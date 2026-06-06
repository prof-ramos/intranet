import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findAssignmentById,
  findAssignmentByName,
  insertAssignment,
  toggleAssignmentActive,
  updateAssignment,
} from './repository';

const {
  mockLimit,
  mockReturning,
  mockInsertValues,
  mockUpdateWhere,
  selectQueue,
} = vi.hoisted(() => ({
  mockLimit: vi.fn(async () => selectQueue.shift() ?? []),
  mockReturning: vi.fn(async () => [{ id: 1 }]),
  mockInsertValues: vi.fn(),
  mockUpdateWhere: vi.fn().mockResolvedValue(undefined),
  selectQueue: [] as unknown[][],
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
  };

  return { db: mockDb };
});

describe('assignments repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    mockLimit.mockImplementation(async () => selectQueue.shift() ?? []);
    mockInsertValues.mockImplementation(() => ({ returning: mockReturning }));
    mockReturning.mockResolvedValue([{ id: 1 }]);
  });

  describe('findAssignmentById', () => {
    it('returns the assignment when found', async () => {
      selectQueue.push([{ id: 3, name: 'SERE', type: 'nacional', isActive: true }]);

      const result = await findAssignmentById(3);

      expect(result).toEqual({ id: 3, name: 'SERE', type: 'nacional', isActive: true });
    });

    it('returns null when assignment is not found', async () => {
      selectQueue.push([]);

      const result = await findAssignmentById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAssignmentByName', () => {
    it('returns the id when a matching assignment exists', async () => {
      selectQueue.push([{ id: 7 }]);

      const result = await findAssignmentByName('Embaixada em Paris');

      expect(result).toEqual({ id: 7 });
    });

    it('returns null when no assignment matches the name', async () => {
      selectQueue.push([]);

      const result = await findAssignmentByName('Inexistente');

      expect(result).toBeNull();
    });
  });

  describe('insertAssignment', () => {
    it('inserts and returns the new assignment id', async () => {
      mockReturning.mockResolvedValue([{ id: 42 }]);

      const result = await insertAssignment({ name: 'Consulado em Lisboa', type: 'exterior' });

      expect(result).toEqual({ id: 42 });
      expect(mockInsertValues).toHaveBeenCalledWith({
        name: 'Consulado em Lisboa',
        type: 'exterior',
      });
    });
  });

  describe('updateAssignment', () => {
    it('calls update with correct id and values', async () => {
      await updateAssignment(9, { name: 'Novo Nome', type: 'exterior' });

      expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleAssignmentActive', () => {
    it('flips isActive from true to false and returns updated state', async () => {
      selectQueue.push([{ id: 4, name: 'Consulado em Lisboa', isActive: true }]);

      const result = await toggleAssignmentActive(4);

      expect(result).toEqual({ name: 'Consulado em Lisboa', isActive: false });
      expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    });

    it('flips isActive from false to true and returns updated state', async () => {
      selectQueue.push([{ id: 2, name: 'SERE', isActive: false }]);

      const result = await toggleAssignmentActive(2);

      expect(result).toEqual({ name: 'SERE', isActive: true });
    });

    it('throws when assignment is not found', async () => {
      selectQueue.push([]);

      await expect(toggleAssignmentActive(999)).rejects.toThrow('não encontrada');
    });
  });
});
