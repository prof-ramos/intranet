import { vi, describe, it, expect, beforeEach } from 'vitest';
import { persistTriage, persistFailure } from './persister';
import type { EmailPayload, EmailTriageResult } from './schema';

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 42 }])),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema/email-triage', () => ({
  emailTriagens: {
    messageId: 'messageId',
    id: 'id',
  },
}));

vi.mock('./system-prompt', () => ({
  EMAIL_TRIAGE_VERSION: 'email-controller-mvp-v1',
}));

describe('persistTriage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists triage and returns the inserted id', async () => {
    const { db } = await import('@/lib/db');
    const insertMock = vi.mocked(db.insert);

    const payload: EmailPayload = {
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

    const result: EmailTriageResult = {
      categoria: 'juridico',
      resumo: 'Resumo.',
      ha_prazo: false,
      exige_validacao_humana: false,
      nivel_risco: 'baixo',
      confianca: 'alta',
      acao_recomendada: 'Encaminhar.',
      legal_basis: 'interesse_legitimo',
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
    };

    const id = await persistTriage(payload, result, 'gemini-2.5-flash', null);

    expect(id).toBe(42);
    expect(insertMock).toHaveBeenCalled();
    const valuesCall = insertMock.mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: 'msg-123',
        status: 'analisado',
        categoria: 'juridico',
      }),
    );
  });

  it('sets status to aguardando_validacao when human review is required', async () => {
    const { db } = await import('@/lib/db');
    const insertMock = vi.mocked(db.insert);

    const payload: EmailPayload = {
      message_id: 'msg-456',
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

    const result: EmailTriageResult = {
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
    };

    await persistTriage(payload, result, 'gemini-2.5-flash', null);

    const valuesCall = insertMock.mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'aguardando_validacao',
      }),
    );
  });
});

describe('persistFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a failure record with erro_validacao_ia status', async () => {
    const { db } = await import('@/lib/db');
    const insertMock = vi.mocked(db.insert);

    const payload: EmailPayload = {
      message_id: 'msg-789',
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

    await persistFailure(payload, 'Gemini timeout', 'gemini-2.5-flash');

    expect(insertMock).toHaveBeenCalled();
    const valuesCall = insertMock.mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'erro_validacao_ia',
        messageId: 'msg-789',
        resumo: expect.stringContaining('Gemini timeout'),
      }),
    );
  });
});
