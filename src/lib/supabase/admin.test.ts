import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import {
  deleteAdminAuthUser,
  ensureAdminPasswordAuthUser,
  generatePasswordResetLink,
} from './admin';

const {
  listUsersMock,
  updateUserByIdMock,
  createUserMock,
  deleteUserMock,
  generateLinkMock,
  logAuditActionMock,
  envMock,
} = vi.hoisted(() => ({
  listUsersMock: vi.fn(),
  updateUserByIdMock: vi.fn(),
  createUserMock: vi.fn(),
  deleteUserMock: vi.fn(),
  generateLinkMock: vi.fn(),
  logAuditActionMock: vi.fn(),
  envMock: {
    ASOF_INTRANET_URL: 'https://intranet.asof.com.br',
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => listUsersMock(...args),
        updateUserById: (...args: unknown[]) => updateUserByIdMock(...args),
        createUser: (...args: unknown[]) => createUserMock(...args),
        deleteUser: (...args: unknown[]) => deleteUserMock(...args),
        generateLink: (...args: unknown[]) => generateLinkMock(...args),
      },
    },
  })),
}));

vi.mock('@/lib/env', () => ({
  env: envMock,
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
    generateLinkMock.mockResolvedValue({
      data: {
        properties: {
          action_link: 'https://example.supabase.co/auth/v1/verify?token=abc',
        },
      },
      error: null,
    });
    logAuditActionMock.mockResolvedValue(undefined);
    envMock.ASOF_INTRANET_URL = 'https://intranet.asof.com.br';
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
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    logAuditActionMock.mockRejectedValue(
      Object.assign(new Error('cpf=12345678901'), { code: 'E_AUDIT' }),
    );

    await deleteAdminAuthUser('admin@asof.local', 7);

    expect(deleteUserMock).toHaveBeenCalledWith('auth-1');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[deleteAdminAuthUser] audit logging failed', {
      error: expect.objectContaining({
        kind: 'error',
        name: 'Error',
        code: 'E_AUDIT',
      }),
    });
    consoleErrorSpy.mockRestore();
  });

  it('generates recovery links with the production intranet redirect URL', async () => {
    const link = await generatePasswordResetLink('admin@asof.local');

    expect(link).toBe('https://example.supabase.co/auth/v1/verify?token=abc');
    expect(generateLinkMock).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'admin@asof.local',
      options: {
        redirectTo: 'https://intranet.asof.com.br/change-password',
      },
    });
  });
});
