import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetUserPassword, toggleUserActive } from './actions';
import { temporaryPasswordEmailHtml } from '@/lib/email/templates';

const {
  requireRoleMock,
  hashMock,
  revalidatePathMock,
  selectQueue,
  insertQueue,
  mockLimit,
  mockInsertValues,
  mockUpdateWhere,
  sendEmailMock,
  loggerErrorMock,
  envMock,
} = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  hashMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  sendEmailMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  envMock: {
    MAILJET_API_KEY: undefined as string | undefined,
    MAILJET_SECRET_KEY: undefined as string | undefined,
    MAILJET_SENDER_VALIDATED: false,
  },
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

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: loggerErrorMock,
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/error-log', () => ({
  toSafeErrorLog: (err: unknown) => {
    if (!(err instanceof Error)) {
      return { kind: 'non_error_thrown' };
    }

    const errorWithMetadata = err as Error & { code?: unknown; status?: unknown };
    return {
      kind: 'error',
      name: err.name,
      code: typeof errorWithMetadata.code === 'string' ? errorWithMetadata.code : undefined,
      status: typeof errorWithMetadata.status === 'number' ? errorWithMetadata.status : undefined,
    };
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock('@/lib/env', () => ({
  env: envMock,
}));

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
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
    hashMock.mockResolvedValue('hashed-password');
    sendEmailMock.mockResolvedValue(undefined);
    envMock.MAILJET_API_KEY = undefined;
    envMock.MAILJET_SECRET_KEY = undefined;
    envMock.MAILJET_SENDER_VALIDATED = false;
    mockLimit.mockImplementation(async () => selectQueue.shift() ?? []);
    mockInsertValues.mockImplementation(() => insertQueue.shift());
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  it('generates a local temporary password, audits, and revalidates', async () => {
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
    expect(result.message).toContain('Senha temporária gerada');
    expect(result.tempPassword).toEqual(expect.any(String));
    expect(hashMock).toHaveBeenCalledWith(expect.any(String), 12);
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

  it('sends configured Mailjet temporary password email without returning fallback secrets', async () => {
    envMock.MAILJET_API_KEY = 'mailjet-key';
    envMock.MAILJET_SECRET_KEY = 'mailjet-secret';
    envMock.MAILJET_SENDER_VALIDATED = true;
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

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'maria@asof.local',
        toName: 'Maria',
        subject: 'Redefinição de senha — ASOF Intranet',
      }),
    );
    expect(result).toEqual({
      success: true,
      message: 'Senha temporária gerada e enviada ao usuário.',
      tempPassword: undefined,
    });
  });

  it('returns fallback password when configured Mailjet delivery fails without logging raw response body', async () => {
    envMock.MAILJET_API_KEY = 'mailjet-key';
    envMock.MAILJET_SECRET_KEY = 'mailjet-secret';
    envMock.MAILJET_SENDER_VALIDATED = true;
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
    const mailjetError = new Error(
      'Mailjet error 400: {"Messages":[{"To":[{"Email":"maria@asof.local"}],"Errors":[{"ErrorMessage":"SenhaTemp123!"}]}]}',
    ) as Error & { code: string; status: number };
    mailjetError.code = 'MAILJET_SEND_FAILED';
    mailjetError.status = 400;
    sendEmailMock.mockRejectedValue(mailjetError);

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'Senha temporária gerada. Comunique-a ao usuário por canal seguro.',
    );
    expect(result.tempPassword).toEqual(expect.any(String));
    expect(loggerErrorMock).toHaveBeenCalledWith(
      '[resetUserPassword] Failed to deliver password reset email.',
      {
        targetId: 10,
        error: {
          kind: 'error',
          name: 'Error',
          code: 'MAILJET_SEND_FAILED',
          status: 400,
        },
      },
    );
    const loggedArgs = JSON.stringify(loggerErrorMock.mock.calls);
    expect(loggedArgs).not.toContain('maria@asof.local');
    expect(loggedArgs).not.toContain('SenhaTemp123');
    expect(loggedArgs).not.toContain('Messages');
  });

  it('uses fallback password instead of Mailjet when the sender is not explicitly validated', async () => {
    envMock.MAILJET_API_KEY = 'mailjet-key';
    envMock.MAILJET_SECRET_KEY = 'mailjet-secret';
    envMock.MAILJET_SENDER_VALIDATED = false;
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

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'Senha temporária gerada. Comunique-a ao usuário por canal seguro.',
    );
    expect(result.tempPassword).toEqual(expect.any(String));
  });

  it('escapes temporary password in email HTML', () => {
    const html = temporaryPasswordEmailHtml('Maria', 'Temp<"abc">&');

    expect(html).toContain('Temp&lt;&quot;abc&quot;&gt;&amp;');
    expect(html).not.toContain('Temp<"abc">&');
  });

  it('rejects password reset for the current actor', async () => {
    const formData = new FormData();
    formData.set('userId', '7');

    const result = await resetUserPassword(null, formData);

    expect(result).toEqual({
      success: false,
      message: 'Use a página de troca de senha para alterar sua própria senha.',
    });
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
