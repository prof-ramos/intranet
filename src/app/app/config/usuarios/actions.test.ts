import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetUserPassword, toggleUserActive } from './actions';
import { passwordResetEmailHtml } from '@/lib/email/templates';

const {
  requireRoleMock,
  ensureAdminPasswordAuthUserMock,
  generatePasswordResetLinkMock,
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
  ensureAdminPasswordAuthUserMock: vi.fn(),
  generatePasswordResetLinkMock: vi.fn(),
  hashMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  sendEmailMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  envMock: {
    MAILJET_API_KEY: undefined as string | undefined,
    MAILJET_SECRET_KEY: undefined as string | undefined,
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

vi.mock('@/lib/supabase/admin', () => ({
  ensureAdminPasswordAuthUser: (...args: unknown[]) => ensureAdminPasswordAuthUserMock(...args),
  generatePasswordResetLink: (...args: unknown[]) => generatePasswordResetLinkMock(...args),
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
    ensureAdminPasswordAuthUserMock.mockResolvedValue({ userId: 'auth-1', created: false });
    generatePasswordResetLinkMock.mockResolvedValue('https://supabase.co/recovery?token=abc');
    hashMock.mockResolvedValue('hashed-password');
    sendEmailMock.mockResolvedValue(undefined);
    envMock.MAILJET_API_KEY = undefined;
    envMock.MAILJET_SECRET_KEY = undefined;
    mockLimit.mockImplementation(async () => selectQueue.shift() ?? []);
    mockInsertValues.mockImplementation(() => insertQueue.shift());
  });

  it('generates reset link before invalidating password, then syncs supabase auth, audits, and revalidates', async () => {
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
    expect(result.message).toContain('Senha resetada');
    expect(result.resetLink).toBe('https://supabase.co/recovery?token=abc');
    expect(result.tempPassword).toEqual(expect.any(String));
    // Link generated BEFORE password invalidation
    expect(generatePasswordResetLinkMock).toHaveBeenCalledWith('maria@asof.local');
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

  it('sends configured Mailjet reset email without returning fallback secrets or target email', async () => {
    envMock.MAILJET_API_KEY = 'mailjet-key';
    envMock.MAILJET_SECRET_KEY = 'mailjet-secret';
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
      message: 'Senha resetada. Email de recuperação enviado ao usuário.',
      resetLink: undefined,
      tempPassword: undefined,
    });
  });

  it('returns fallback secrets when configured Mailjet delivery fails without logging raw response body', async () => {
    envMock.MAILJET_API_KEY = 'mailjet-key';
    envMock.MAILJET_SECRET_KEY = 'mailjet-secret';
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
      'Mailjet error 400: {"Messages":[{"To":[{"Email":"maria@asof.local"}],"Errors":[{"ErrorMessage":"https://supabase.co/recovery?token=abc"}]}]}',
    ) as Error & { code: string; status: number };
    mailjetError.code = 'MAILJET_SEND_FAILED';
    mailjetError.status = 400;
    sendEmailMock.mockRejectedValue(mailjetError);

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Senha resetada. Comunique o link de recuperação ao usuário por canal seguro.');
    expect(result.resetLink).toBe('https://supabase.co/recovery?token=abc');
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
    expect(loggedArgs).not.toContain('supabase.co/recovery');
    expect(loggedArgs).not.toContain('Messages');
  });

  it('throws sanitized Mailjet errors without raw response body', async () => {
    envMock.MAILJET_API_KEY = 'mailjet-key';
    envMock.MAILJET_SECRET_KEY = 'mailjet-secret';
    const rawResponseBody = '{"Messages":[{"To":[{"Email":"maria@asof.local"}]}]}';
    const { sendEmail } = await vi.importActual<typeof import('@/lib/email')>('@/lib/email');
    const fetchMock = vi.fn(async () => new Response(rawResponseBody, { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      await expect(
        sendEmail({
          to: 'maria@asof.local',
          toName: 'Maria',
          subject: 'Redefinição de senha — ASOF Intranet',
          htmlBody: '<p>reset</p>',
          textBody: 'reset',
        }),
      ).rejects.toMatchObject({
        name: 'MailjetSendError',
        message: 'Mailjet send failed with status 400',
        code: 'MAILJET_SEND_FAILED',
        status: 400,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('escapes reset link in password reset email href attributes', () => {
    const html = passwordResetEmailHtml('Maria', 'https://asof.local/reset?token="abc"&next=<script>');

    expect(html).toContain('href="https://asof.local/reset?token=&quot;abc&quot;&amp;next=&lt;script&gt;"');
    expect(html).not.toContain('href="https://asof.local/reset?token="abc"&next=<script>"');
  });

  it('aborts without invalidating password when link generation fails', async () => {
    selectQueue.push([
      {
        id: 10,
        name: 'Maria',
        email: 'maria@asof.local',
        role: 'secretaria',
        isActive: true,
      },
    ]);
    generatePasswordResetLinkMock.mockRejectedValue(new Error('generateLink failed'));

    const formData = new FormData();
    formData.set('userId', '10');

    const result = await resetUserPassword(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Falha ao gerar link de recuperação');
    // Password should NOT have been invalidated
    expect(ensureAdminPasswordAuthUserMock).not.toHaveBeenCalled();
    expect(mockUpdateWhere).not.toHaveBeenCalled();
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
