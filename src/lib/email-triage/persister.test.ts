/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { persistTriage, persistFailure, buildTriagemValues } from './persister';
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
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
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

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('./system-prompt', () => ({
  EMAIL_TRIAGE_VERSION: 'email-controller-mvp-v1',
}));

describe('buildTriagemValues', () => {
  const basePayload: EmailPayload = {
    message_id: 'msg-123',
    thread_id: 'thread-456',
    history_id: 'hist-789',
    received_at: '2026-06-01T10:00:00Z',
    sender: 'sender@example.com',
    original_recipient: 'to@example.com',
    subject: 'Test Subject',
    body_hash: 'abc123',
    body_excerpt: '[short-body]',
    analysis_excerpt: 'analysis',
    attachments: [],
  };

  const baseResult: EmailTriageResult = {
    categoria: 'juridico',
    resumo: 'Resumo.',
    ha_prazo: false,
    exige_validacao_humana: false,
    nivel_risco: 'baixo',
    confianca: 'alta',
    acao_recomendada: 'Encaminhar.',
    legal_basis: 'interesse_legitimo',
    processed_purpose: 'classificacao',
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

  it('correctly maps base fields', () => {
    const values = buildTriagemValues(basePayload, baseResult, 'gemini-2.5-flash', 'response-123');

    expect(values).toEqual({
      messageId: 'msg-123',
      threadId: 'thread-456',
      historyId: 'hist-789',
      receivedAt: new Date('2026-06-01T10:00:00Z'),
      sender: 'sender@example.com',
      originalRecipient: 'to@example.com',
      subject: 'Test Subject',
      bodyHash: 'abc123',
      bodyExcerpt: '[short-body]',
      rawBodyStored: false,
      redactionApplied: true,
      categoria: 'juridico',
      resumo: 'Resumo.',
      threadContextSummary: null,
      haPrazo: false,
      prazoData: null,
      prazoHora: null,
      prazoConfiancaData: null,
      tipoPrazo: null,
      trechoFonteDoPrazo: null,
      resumoAnexos: [],
      sourceEvidence: [],
      attachmentsHashes: [],
      nivelRisco: 'baixo',
      confianca: 'alta',
      acaoRecomendada: 'Encaminhar.',
      responsavelSugerido: null,
      exigeValidacaoHumana: false,
      legalBasis: 'interesse_legitimo',
      processedPurpose: 'classificacao',
      dataRetentionUntil: null,
      processingVersion: 'email-controller-mvp-v1',
      modelName: 'gemini-2.5-flash',
      modelResponseId: 'response-123',
      status: 'analisado',
    });
  });

  it('sets status based on exige_validacao_humana', () => {
    const valuesAguardando = buildTriagemValues(
      basePayload,
      { ...baseResult, exige_validacao_humana: true },
      'model',
      'id',
    );
    expect(valuesAguardando.status).toBe('aguardando_validacao');

    const valuesAnalisado = buildTriagemValues(
      basePayload,
      { ...baseResult, exige_validacao_humana: false },
      'model',
      'id',
    );
    expect(valuesAnalisado.status).toBe('analisado');
  });

  it('extracts non-null attachment hashes', () => {
    const payloadWithAttachments: EmailPayload = {
      ...basePayload,
      attachments: [
        {
          filename: 'a.pdf',
          mime_type: 'application/pdf',
          sha256: 'hash1',
          resumo: '',
          ha_prazo_no_anexo: false,
          trechos_relevantes: [],
        },
        {
          filename: 'b.pdf',
          mime_type: 'application/pdf',
          sha256: null,
          resumo: '',
          ha_prazo_no_anexo: false,
          trechos_relevantes: [],
        },
        {
          filename: 'c.pdf',
          mime_type: 'application/pdf',
          sha256: 'hash2',
          resumo: '',
          ha_prazo_no_anexo: false,
          trechos_relevantes: [],
        },
      ],
    };
    const values = buildTriagemValues(payloadWithAttachments, baseResult, 'model', 'id');
    expect(values.attachmentsHashes).toEqual(['hash1', 'hash2']);
  });

  it('handles empty or missing optional payload fields as fallback', () => {
    const payloadMissingOptionals: EmailPayload = {
      ...basePayload,
      history_id: '',
      original_recipient: '',
    };

    // Test the specific fallbacks in buildTriagemValues
    // payload.history_id || null
    // payload.original_recipient || null

    const values = buildTriagemValues(payloadMissingOptionals, baseResult, 'model', 'id');
    expect(values.historyId).toBeNull();
    expect(values.originalRecipient).toBeNull();
  });
});

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
      advogado_nome: null,
      advogado_email: null,
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
      advogado_nome: null,
      advogado_email: null,
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

  it('preserves existing valid record instead of overwriting with failure', async () => {
    const { db } = await import('@/lib/db');
    const insertMock = vi.mocked(db.insert);
    const selectMock = vi.mocked(db.select);

    selectMock.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 999 }])),
        })),
      })),
    } as any);

    const payload: EmailPayload = {
      message_id: 'msg-already-triaged',
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

    await persistFailure(payload, 'Gemini timeout on re-run', 'gemini-2.5-flash');

    expect(insertMock).not.toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledTimes(1);
  });
});
