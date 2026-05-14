import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiKey, listApiKeys, revokeApiKey, rotateApiKey, VALID_SCOPES, hashKey } from './service';

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockReturning = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();

function mockExecutor() {
  const chain = {
    values: (...args: unknown[]) => mockValues(...args),
    returning: () => mockReturning(),
    from: () => mockFrom(),
    where: () => mockWhere(),
    orderBy: () => mockOrderBy(),
    set: (...args: unknown[]) => mockSet(...args),
  };
  return chain;
}

function createMockExecutor() {
  const chain = mockExecutor();
  mockInsert.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockValues.mockReturnValue(chain);
  mockReturning.mockResolvedValue([
    {
      id: 1,
      name: 'Test Key',
      keyHash: 'hash',
      scopes: ['events:read'],
      isActive: true,
      createdBy: 1,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ]);
  mockFrom.mockReturnValue(chain);
  mockWhere.mockReturnValue(chain);
  mockOrderBy.mockReturnValue([]);
  mockSet.mockReturnValue(chain);
  return chain;
}

describe('integration API key service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('creates a key with valid scopes', async () => {
      const chain = createMockExecutor();

      const result = await createApiKey('Test Key', ['events:read'], 1, {
        insert: mockInsert,
      } as unknown as Parameters<typeof createApiKey>[3]);

      expect(result.key).toMatch(/^asof_/);
      expect(result.scopes).toEqual(['events:read']);
      expect(result.name).toBe('Test Key');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('rejects invalid scopes', async () => {
      await expect(createApiKey('Test', ['invalid:scope'], 1)).rejects.toThrow('Invalid scope');
    });

    it('generates different keys for each call', async () => {
      createMockExecutor();
      createMockExecutor();

      const result1 = await createApiKey('Key 1', ['events:read'], 1, {
        insert: mockInsert,
      } as unknown as Parameters<typeof createApiKey>[3]);
      const result2 = await createApiKey('Key 2', ['events:read'], 1, {
        insert: mockInsert,
      } as unknown as Parameters<typeof createApiKey>[3]);

      expect(result1.key).not.toBe(result2.key);
    });
  });

  describe('revokeApiKey', () => {
    it('revokes an active key', async () => {
      const chain = createMockExecutor();
      mockReturning.mockResolvedValue([{ id: 1 }]);

      const result = await revokeApiKey(1, {
        update: mockUpdate,
      } as unknown as Parameters<typeof revokeApiKey>[1]);

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('returns false for already-revoked key', async () => {
      createMockExecutor();
      mockReturning.mockResolvedValue([]);

      const result = await revokeApiKey(999, {
        update: mockUpdate,
      } as unknown as Parameters<typeof revokeApiKey>[1]);

      expect(result).toBe(false);
    });
  });

  describe('rotateApiKey', () => {
    it('creates a new key and revokes the old one', async () => {
      const chain = createMockExecutor();
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () => [
              { name: 'Old Key', scopes: ['events:read', 'webhooks:manage'], isActive: true },
            ],
          }),
        }),
      });
      mockReturning.mockResolvedValueOnce([
        {
          id: 2,
          name: 'Old Key',
          keyHash: 'new-hash',
          scopes: ['events:read', 'webhooks:manage'],
          isActive: true,
          createdBy: 1,
          createdAt: new Date('2026-01-02'),
          updatedAt: new Date('2026-01-02'),
        },
      ]);

      const result = await rotateApiKey(1, 1, {
        insert: mockInsert,
        update: mockUpdate,
        select: mockSelect,
      } as unknown as Parameters<typeof rotateApiKey>[2]);

      expect(result).not.toBeNull();
      expect(result!.key).toMatch(/^asof_/);
      expect(result!.scopes).toEqual(['events:read', 'webhooks:manage']);
    });

    it('returns null for non-existent or inactive key', async () => {
      createMockExecutor();
      mockSelect.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () => [],
          }),
        }),
      });

      const result = await rotateApiKey(999, 1, {
        insert: mockInsert,
        update: mockUpdate,
        select: mockSelect,
      } as unknown as Parameters<typeof rotateApiKey>[2]);

      expect(result).toBeNull();
    });
  });

  describe('hashKey', () => {
    it('produces a deterministic SHA-256 hex string', () => {
      const hash = hashKey('test-key');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hashKey('test-key')).toBe(hash);
    });

    it('produces different hashes for different keys', () => {
      expect(hashKey('key-1')).not.toBe(hashKey('key-2'));
    });
  });

  describe('VALID_SCOPES', () => {
    it('contains expected scopes', () => {
      expect(VALID_SCOPES).toContain('events:read');
      expect(VALID_SCOPES).toContain('events:write');
      expect(VALID_SCOPES).toContain('webhooks:manage');
      expect(VALID_SCOPES).toContain('admin');
    });
  });
});