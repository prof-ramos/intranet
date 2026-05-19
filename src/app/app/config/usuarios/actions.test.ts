import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetUserPassword, toggleUserActive } from './actions';

const {
  requireRoleMock,
  ensureAdminPasswordAuthUserMock,
  sendPasswordResetEmailMock,
  hashMock,
  revalidatePathMock,
  selectQueue,
  insertQueue,
  mockLimit,
  mockInsertValues,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  ensureAdminPasswordAuthUserMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
  hashMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  selectQueue: [] as unknown[][],
  insertQueue: [] as unknown[],
  mockLimit: vi.fn(async () => selectQueue.shift() ?? []),
  mockInsertValues: vi.fn(() => insertQueue.shift()),
  mockUpdateWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: (...args: unknown[]) => hashMock(...args),
  },
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  ensureAdminPasswordAuthUser: (...args: unknown[]) => ensureAdminPasswordAuthUserMock(...args),
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmailMock(...args),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/error-log', () => ({
  toSafeErrorLog: (err: unknown) => String(err),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

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
      set: vi.fn(() => ({
        where: mockUpdateWhere,
      })),
    })),
    insert: vi.fn(() => ({
      values: mockInsertValues,
    })),
  },
}));

describe('config usuarios actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    insertQueue.length = 0;
    requireRoleMock.mockResolvedValue({ userId: 7 });
    ensureAdminPasswordAuthUserMock.mockResolvedValue({ userId: 'auth-1', created: false });
    sendPasswordResetEmailMock.mockResolvedValue(undefined);
    hashMock.mockResolvedValue('hashed-password');
    mockLimit.mockImplementation(async () => selectQueue.shift() ?? []);
    mockInsertValues.mockImplementation(() => insertQueue.shift());
  });

  it('resets another active user password, syncs supabase auth, sends reset email, audits, and revalidates', async () => {
    selectQueue.push([
      {
        id: 10,
        name: 'Maria',
        email: 'maria@asof.local',
        role: 'secretaria',
        isActive: true,
      },
    ]);
    insertQueue.push(undefined);

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Senha de Maria foi resetada com sucesso. O usuário receberá um e-mail para definir uma nova senha.');
    expect('tempPassword' in result).toBe(false);
    expect(hashMock).toHaveBeenCalledWith(expect.any(String), 12);
    expect(ensureAdminPasswordAuthUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@asof.local',
        name: 'Maria',
        role: 'secretaria',
        mustChangePassword: true,
        resetPassword: true,
      }),
    );
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith('maria@asof.local');
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'password_reset',
        entityType: 'admin',
        entityId: 10,
        performedBy: 7,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/usuarios');
  });

  it('returns degraded success when reset email fails', async () => {
    selectQueue.push([
      {
        id: 10,
        name: 'Maria',
        email: 'maria@asof.local',
        role: 'secretaria',
        isActive: true,
      },
    ]);
    insertQueue.push(undefined);
    sendPasswordResetEmailMock.mockRejectedValue(new Error('SMTP failed'));

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result.success).toBe(true);
    expect(result.message).toContain('e-mail de redefinição falhou');
    expect('tempPassword' in result).toBe(false);
  });

  it('rejects password reset for the current actor', async () => {
    const formData = new FormData();
    formData.set('userId', '7');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Use a página de troca de senha para alterar sua própria senha.',
    });
    expect(ensureAdminPasswordAuthUserMock).not.toHaveBeenCalled();
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('rejects non-decimal user ids before password reset or toggle', async () => {
    const resetFormData = new FormData();
    resetFormData.set('userId', '1e2');

    await expect(resetUserPassword(null, resetFormData)).resolves.toEqual({
      success: false,
      message: 'Usuário inválido.',
    });

    const toggleFormData = new FormData();
    toggleFormData.set('userId', '0x10');

    await expect(toggleUserActive(null, toggleFormData)).resolves.toEqual({
      success: false,
      message: 'Usuário inválido.',
    });

    expect(ensureAdminPasswordAuthUserMock).not.toHaveBeenCalled();
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('rejects password reset for inactive users', async () => {
    selectQueue.push([
      {
        id: 11,
        name: 'Joao',
        email: 'joao@asof.local',
        role: 'admin',
        isActive: false,
      },
    ]);

    const formData = new FormData();
    formData.set('userId', '11');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Não é possível resetar a senha de um usuário inativo.',
    });
    expect(ensureAdminPasswordAuthUserMock).not.toHaveBeenCalled();
  });

  it('rejects toggling the current actor account', async () => {
    const formData = new FormData();
    formData.set('userId', '7');

    const result = await toggleUserActive(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Não é possível desativar sua própria conta.',
    });
    expect(mockUpdateWhere).not.toHaveBeenCalled();
  });

  it('toggles a target user active flag, audits, and revalidates', async () => {
    selectQueue.push([
      {
        id: 12,
        name: 'Carlos',
        email: 'carlos@asof.local',
        role: 'diretoria',
        isActive: false,
      },
    ]);
    insertQueue.push(undefined);

    const formData = new FormData();
    formData.set('userId', '12');

    const result = await toggleUserActive(null, formData);

    expect(result).toEqual({
      success: true,
      message: 'Usuário Carlos foi ativado com sucesso.',
    });
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account_activated',
        entityType: 'admin',
        entityId: 12,
        performedBy: 7,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/config/usuarios');
  });
});