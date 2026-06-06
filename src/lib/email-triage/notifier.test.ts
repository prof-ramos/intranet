/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { notifyNeedsValidation } from './notifier';
import type { EmailPayload, EmailTriageResult } from './schema';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ id: 1 }, { id: 2 }])),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  admins: {
    id: 'id',
    role: 'role',
  },
}));

vi.mock('@/lib/system-users', () => ({
  resolveSystemBotUser: vi.fn(() => Promise.resolve(99)),
}));

vi.mock('@/lib/notifications/service', () => ({
  createNotificationFromEvent: vi.fn(() => Promise.resolve({ id: 1 })),
}));

const mockPayload: EmailPayload = {
  message_id: 'msg-123',
  thread_id: 'thread-456',
  history_id: 'hist-789',
  received_at: '2026-06-01T10:00:00Z',
  sender: 'sender@example.com',
  original_recipient: 'to@example.com',
  subject: 'Test Subject',
  body_hash: 'abc123',
  body_excerpt: '[short-body-redacted; sha256 stored]',
  analysis_excerpt: 'analysis excerpt',
  attachments: [],
};

const mockTriageResult: EmailTriageResult = {
  categoria: 'juridico',
  resumo: 'Resumo.',
  ha_prazo: false,
  exige_validacao_humana: true,
  nivel_risco: 'alto',
  confianca: 'baixa',
  acao_recomendada: 'Encaminhar.',
  legal_basis: 'avaliacao_humana_necessaria',
  processed_purpose: 'classificacao operacional de e-mail',
  resumo_anexos: [],
  source_evidence: [],
  thread_context_summary: null,
  prazo_data: null,
  prazo_hora: null,
  prazo_confianca_data: null,
  tipo_prazo: null,
  trecho_fonte_do_prazo: null,
  responsavel_sugerido: null,
  advogado_nome: null,
  advogado_email: null,
};

describe('notifyNeedsValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends notifications to all admins and returns ok', async () => {
    const { createNotificationFromEvent } = await import('@/lib/notifications/service');
    const { db } = await import('@/lib/db');
    const { resolveSystemBotUser } = await import('@/lib/system-users');

    const selectMock = vi.mocked(db.select);
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      }),
    } as any);

    const result = await notifyNeedsValidation(mockTriageResult, 42, mockPayload);

    expect(result).toEqual({ ok: true });
    expect(resolveSystemBotUser).toHaveBeenCalled();
    expect(createNotificationFromEvent).toHaveBeenCalledTimes(2);
    expect(createNotificationFromEvent).toHaveBeenCalledWith(
      'email_triage_pending',
      expect.objectContaining({
        recipientId: 1,
        actorId: 99,
        entityId: 42,
        dedupeKey: 'email_triage_pending:42:1',
        message: expect.not.stringContaining(mockPayload.sender),
      }),
      undefined,
    );
    expect(createNotificationFromEvent).toHaveBeenCalledWith(
      'email_triage_pending',
      expect.objectContaining({
        recipientId: 2,
        actorId: 99,
        entityId: 42,
        dedupeKey: 'email_triage_pending:42:2',
        message: expect.not.stringContaining(mockPayload.sender),
      }),
      undefined,
    );
  });

  it('returns error when db.select throws', async () => {
    const { db } = await import('@/lib/db');
    const selectMock = vi.mocked(db.select);
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      }),
    } as any);

    const result = await notifyNeedsValidation(mockTriageResult, 42, mockPayload);

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining('DB connection lost'),
    });
  });

  it('returns error when resolveSystemBotUser throws', async () => {
    const { resolveSystemBotUser } = await import('@/lib/system-users');
    vi.mocked(resolveSystemBotUser).mockRejectedValue(new Error('Bot user not found'));

    const result = await notifyNeedsValidation(mockTriageResult, 42, mockPayload);

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining('Bot user not found'),
    });
  });

  it('returns ok with notifiedCount 0 when there are no admins', async () => {
    const { createNotificationFromEvent } = await import('@/lib/notifications/service');
    const { db } = await import('@/lib/db');
    const { resolveSystemBotUser } = await import('@/lib/system-users');

    vi.mocked(resolveSystemBotUser).mockResolvedValue(99);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await notifyNeedsValidation(mockTriageResult, 42, mockPayload);

    expect(result).toEqual({ ok: true });
    expect(createNotificationFromEvent).not.toHaveBeenCalled();
  });

  it('does not throw when one of two admin notifications fails (partial failure)', async () => {
    const { createNotificationFromEvent } = await import('@/lib/notifications/service');
    const { db } = await import('@/lib/db');
    const { resolveSystemBotUser } = await import('@/lib/system-users');

    vi.mocked(resolveSystemBotUser).mockResolvedValue(99);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      }),
    } as any);

    vi.mocked(createNotificationFromEvent)
      .mockResolvedValueOnce({ id: 1 } as any)
      .mockRejectedValueOnce(new Error('notification insert failed'));

    const result = await notifyNeedsValidation(mockTriageResult, 42, mockPayload);

    expect(result).toEqual({ ok: true });
    expect(createNotificationFromEvent).toHaveBeenCalledTimes(2);
  });
});
