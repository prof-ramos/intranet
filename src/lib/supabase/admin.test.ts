import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteAdminAuthUser,
  ensureAdminPasswordAuthUser,
} from './admin';

const {
  listUsersMock,
  updateUserByIdMock,
  createUserMock,
  deleteUserMock,
  logAuditActionMock,
} = vi.hoisted(() => ({
  listUsersMock: vi.fn(),
  updateUserByIdMock: vi.fn(),
  createUserMock: vi.fn(),
  deleteUserMock: vi.fn(),
  logAuditActionMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => listUsersMock(...args),
        updateUserById: (...args: unknown[]) => updateUserByIdMock(...args),
        createUser: (...args: unknown[]) => createUserMock(...args),
        deleteUser: (...args: unknown[]) => deleteUserMock(...args),
      },
    },
  })),
}));

vi.mock('@/lib/supabase/config', () => ({
  getSupabaseUrl: () => 'https://example.supabase.co',
  getSupabaseServiceRoleKey: () => 'service-role-key',
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: (...args: unknown[]) => logAuditActionMock(...args),
}));

describe('supabase admin helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listUsersMock.mockResolvedValue({
      data: { users: [{ id: 'auth-1', email: 'admin@asof.local' }] },
      error: null,
    });
    updateUserByIdMock.mockResolvedValue({ error: null });
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-2' } }, error: null });
    deleteUserMock.mockResolvedValue({ error: null });
    logAuditActionMock.mockResolvedValue(undefined);
  });

  it('updates an existing auth user', async () => {
    const result = await ensureAdminPasswordAuthUser({
      email: 'admin@asof.local',
      password: 'Senha-Forte-2026!',
      name: 'Admin',
      role: 'admin',
      mustChangePassword: false,
      resetPassword: true,
    });

    expect(result).toEqual({ userId: 'auth-1', created: false });
    expect(updateUserByIdMock).toHaveBeenCalled();
  });

  it('creates a new auth user when none exists', async () => {
    listUsersMock.mockResolvedValue({ data: { users: [] }, error: null });

    const result = await ensureAdminPasswordAuthUser({
      email: 'new@asof.local',
      password: 'Senha-Forte-2026!',
      name: 'Novo',
      role: 'secretaria',
      mustChangePassword: true,
    });

    expect(result).toEqual({ userId: 'auth-2', created: true });
    expect(createUserMock).toHaveBeenCalled();
  });

  it('logs a safe audit error but still deletes the auth user', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logAuditActionMock.mockRejectedValue(
      Object.assign(new Error('cpf=12345678901'), { code: 'E_AUDIT' }),
    );

    await deleteAdminAuthUser('admin@asof.local', 7);

    expect(deleteUserMock).toHaveBeenCalledWith('auth-1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Audit logging failed for deleteAdminAuthUser:',
      {
        kind: 'error',
        name: 'Error',
        code: 'E_AUDIT',
        digest: undefined,
      },
    );
    consoleErrorSpy.mockRestore();
  });
});
