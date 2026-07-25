import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger,
}));

vi.mock('@/lib/error-log', () => ({
  toSafeErrorLog: (err: unknown) => {
    if (!(err instanceof Error)) return { kind: 'non_error_thrown' };
    return { kind: 'error', name: err.name };
  },
}));

const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn();

vi.mock('bcryptjs', () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
}));

const selectQueue: unknown[][] = [];
const mockLimit = vi.fn(async () => selectQueue.shift() ?? []);
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn((_values: unknown) => ({
  where: mockUpdateWhere,
}));
const mockInsertValues = vi.fn();

function expectAtomicSessionVersionIncrement() {
  const update = mockUpdateSet.mock.calls[0]?.[0] as { sessionVersion?: SQL } | undefined;
  expect(update?.sessionVersion).toBeDefined();
  expect(new PgDialect().sqlToQuery(update!.sessionVersion!).sql).toBe(
    '"admins"."session_version" + 1',
  );
}

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockLimit,
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: mockUpdateSet,
    })),
    insert: vi.fn(() => ({
      values: mockInsertValues,
    })),
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      const { db } = await import('@/lib/db');
      return fn(db);
    }),
  },
}));

vi.mock('@/lib/db/retry', () => ({
  retryTransientConnection: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@/lib/env', () => ({
  env: {
    MAILJET_API_KEY: undefined,
    MAILJET_SECRET_KEY: undefined,
    MAILJET_SENDER_VALIDATED: false,
  },
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/email/templates', () => ({
  temporaryPasswordEmailHtml: vi.fn(() => '<html>'),
  temporaryPasswordEmailText: vi.fn(() => 'text'),
}));

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
  });

  describe('authenticate', () => {
    it('returns user on valid credentials', async () => {
      selectQueue.push([
        {
          id: 1,
          name: 'Admin',
          email: 'admin@asof.local',
          passwordHash: 'hashed',
          role: 'admin',
          isActive: true,
          mustChangePassword: false,
        },
      ]);
      mockBcryptCompare.mockResolvedValue(true);

      const { authenticate } = await import('./service');
      const result = await authenticate('admin@asof.local', 'Senha-Forte-2026!');

      expect(result).toEqual({
        id: 1,
        name: 'Admin',
        email: 'admin@asof.local',
        role: 'admin',
        isActive: true,
        mustChangePassword: false,
      });
    });

    it('throws InvalidCredentialsError on wrong password', async () => {
      selectQueue.push([
        {
          id: 1,
          name: 'Admin',
          email: 'admin@asof.local',
          passwordHash: 'hashed',
          role: 'admin',
          isActive: true,
          mustChangePassword: false,
        },
      ]);
      mockBcryptCompare.mockResolvedValue(false);

      const { authenticate, InvalidCredentialsError } = await import('./service');
      await expect(authenticate('admin@asof.local', 'wrong')).rejects.toThrow(
        InvalidCredentialsError,
      );
    });

    it('throws InvalidCredentialsError when user not found', async () => {
      selectQueue.push([]);
      mockBcryptCompare.mockResolvedValue(false);

      const { authenticate, InvalidCredentialsError } = await import('./service');
      await expect(authenticate('nobody@asof.local', 'pass')).rejects.toThrow(
        InvalidCredentialsError,
      );
    });

    it('throws InvalidCredentialsError when user is inactive', async () => {
      selectQueue.push([
        {
          id: 1,
          name: 'Admin',
          email: 'admin@asof.local',
          passwordHash: 'hashed',
          role: 'admin',
          isActive: false,
          mustChangePassword: false,
        },
      ]);
      mockBcryptCompare.mockResolvedValue(true);

      const { authenticate, InvalidCredentialsError } = await import('./service');
      await expect(authenticate('admin@asof.local', 'pass')).rejects.toThrow(
        InvalidCredentialsError,
      );
    });
  });

  describe('changePassword', () => {
    it('updates password hash on valid current password', async () => {
      selectQueue.push([{ id: 7, passwordHash: 'old-hash' }]);
      mockBcryptCompare.mockResolvedValue(true);
      mockBcryptHash.mockResolvedValue('new-hash');

      const { changePassword } = await import('./service');
      await changePassword(7, 'old-password', 'new-password');

      expect(mockBcryptCompare).toHaveBeenCalledWith('old-password', 'old-hash');
      expect(mockBcryptHash).toHaveBeenCalledWith('new-password', 12);
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'new-hash',
          mustChangePassword: false,
          sessionVersion: expect.anything(),
        }),
      );
      expectAtomicSessionVersionIncrement();
      expect(mockUpdateWhere).toHaveBeenCalled();
    });

    it('throws AdminNotFoundError when admin does not exist', async () => {
      selectQueue.push([]);

      const { changePassword, AdminNotFoundError } = await import('./service');
      await expect(changePassword(999, 'old', 'new')).rejects.toThrow(AdminNotFoundError);
    });

    it('throws InvalidCurrentPasswordError on wrong current password', async () => {
      selectQueue.push([{ id: 7, passwordHash: 'old-hash' }]);
      mockBcryptCompare.mockResolvedValue(false);

      const { changePassword, InvalidCurrentPasswordError } = await import('./service');
      await expect(changePassword(7, 'wrong', 'new')).rejects.toThrow(InvalidCurrentPasswordError);
      expect(mockUpdateSet).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('generates temp password, updates DB, and audits', async () => {
      selectQueue.push([
        { id: 10, name: 'Maria', email: 'maria@asof.local', role: 'secretaria', isActive: true },
      ]);
      mockBcryptHash.mockResolvedValue('hashed-temp');
      mockInsertValues.mockResolvedValue(undefined);

      const { resetPassword } = await import('./service');
      const result = await resetPassword(10, 7);

      expect(result.tempPassword).toEqual(expect.any(String));
      expect(result.tempPassword.length).toBeGreaterThanOrEqual(8);
      expect(result.emailDelivered).toBe(false);
      expect(mockBcryptHash).toHaveBeenCalledWith(expect.any(String), 12);
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed-temp',
          mustChangePassword: true,
          sessionVersion: expect.anything(),
        }),
      );
      expectAtomicSessionVersionIncrement();
      expect(mockUpdateWhere).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'password_reset',
          entityType: 'admin',
          entityId: 10,
          performedBy: 7,
        }),
      );
    });

    it('throws AdminNotFoundError when target does not exist', async () => {
      selectQueue.push([]);

      const { resetPassword, AdminNotFoundError } = await import('./service');
      await expect(resetPassword(999, 7)).rejects.toThrow(AdminNotFoundError);
    });

    it('throws InactiveAdminError when target is inactive', async () => {
      selectQueue.push([
        { id: 11, name: 'Joao', email: 'joao@asof.local', role: 'admin', isActive: false },
      ]);

      const { resetPassword, InactiveAdminError } = await import('./service');
      await expect(resetPassword(11, 7)).rejects.toThrow(InactiveAdminError);
    });
  });

  describe('toggleAdminActive', () => {
    it('flips isActive, updates DB, and audits', async () => {
      selectQueue.push([{ id: 12, name: 'Carlos', isActive: false }]);
      mockInsertValues.mockResolvedValue(undefined);

      const { toggleAdminActive } = await import('./service');
      const result = await toggleAdminActive(12, 7);

      expect(result).toEqual({ name: 'Carlos', isActive: true });
      expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
      expect(mockUpdateWhere).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'account_activated',
          entityType: 'admin',
          entityId: 12,
          performedBy: 7,
        }),
      );
    });

    it('deactivates an active admin and audits account_deactivated', async () => {
      selectQueue.push([{ id: 13, name: 'Ana', isActive: true }]);
      mockInsertValues.mockResolvedValue(undefined);

      const { toggleAdminActive } = await import('./service');
      const result = await toggleAdminActive(13, 7);

      expect(result).toEqual({ name: 'Ana', isActive: false });
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'account_deactivated', entityId: 13 }),
      );
    });

    it('throws AdminNotFoundError when target does not exist', async () => {
      selectQueue.push([]);

      const { toggleAdminActive, AdminNotFoundError } = await import('./service');
      await expect(toggleAdminActive(999, 7)).rejects.toThrow(AdminNotFoundError);
    });
  });
});
