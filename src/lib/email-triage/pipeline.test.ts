/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { processEmail } from './pipeline';
import type { EmailTriageResult } from './schema';

// ─── Module mocks ────────────────────────────────────────────────────────

vi.mock('@/lib/env', () => ({
  env: {
    GEMINI_API_KEY: 'test-key',
  },
}));

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
          limit: vi.fn(() => Promise.resolve([{ id: 1 }])),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/db/schema/email-triage', () => ({
  emailTriagens: {},
  emailStatusTriagem: {},
}));

vi.mock('@/lib/db/schema', () => ({
  admins: {},
}));

const mockGetMessage = vi.fn();
const mockMarkAsTriaged = vi.fn();
const mockEnsureLabel = vi.fn();
const mockGetHeader = vi.fn();

vi.mock('./gmail', () => ({
  getMessage: (...args: any[]) => mockGetMessage(...args),
  markAsTriaged: (...args: any[]) => mockMarkAsTriaged(...args),
  ensureLabel: (...args: any[]) => mockEnsureLabel(...args),
  getHeader: (...args: any[]) => mockGetHeader(...args),
}));

const mockExtractTextAndAttachments = vi.fn();
const mockAnalyzeEmail = vi.fn();
const mockBuildPersistedExcerpt = vi.fn();
const mockRedactExcerpt = vi.fn();

vi.mock('./analyzer', () => ({
  extractTextAndAttachments: (...args: any[]) => mockExtractTextAndAttachments(...args),
  analyzeEmail: (...args: any[]) => mockAnalyzeEmail(...args),
  buildPersistedExcerpt: (...args: any[]) => mockBuildPersistedExcerpt(...args),
  redactExcerpt: (...args: any[]) => mockRedactExcerpt(...args),
}));

const mockBuildCorrelationContext = vi.fn();
const mockApplyCorrelationActions = vi.fn();
const mockResolveSystemBotUser = vi.fn();

vi.mock('./correlation-context', () => ({
  buildCorrelationContext: (...args: any[]) => mockBuildCorrelationContext(...args),
}));

vi.mock('./correlation-actions', () => ({
  applyCorrelationActions: (...args: any[]) => mockApplyCorrelationActions(...args),
}));

vi.mock('@/lib/system-users', () => ({
  resolveSystemBotUser: (...args: any[]) => mockResolveSystemBotUser(...args),
}));

const mockCreateNotificationFromEvent = vi.fn();

vi.mock('@/lib/notifications/service', () => ({
  createNotificationFromEvent: (...args: any[]) => mockCreateNotificationFromEvent(...args),
}));

const mockPersistTriage = vi.fn((..._args: any[]) => Promise.resolve(42));
const mockPersistFailure = vi.fn((..._args: any[]) => Promise.resolve());

vi.mock('./persister', () => ({
  persistTriage: (...args: any[]) => mockPersistTriage(...args),
  persistFailure: (...args: any[]) => mockPersistFailure(...args),
  buildTriagemValues: vi.fn(),
}));

const mockNotifyNeedsValidation = vi.fn((..._args: any[]) => Promise.resolve({ ok: true }));

vi.mock('./notifier', () => ({
  notifyNeedsValidation: (...args: any[]) => mockNotifyNeedsValidation(...args),
}));

vi.mock('./domain-materializer', () => ({
  materializarNoDominio: vi.fn(() => Promise.resolve()),
}));

// ─── Tests ───────────────────────────────────────────────────────────────

describe('processEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a valid email end-to-end', async () => {
    const gmailMessage = {
      id: 'msg-123',
      threadId: 'thread-456',
      historyId: 'hist-789',
      payload: {
        headers: [
          { name: 'From', value: 'sender@example.com' },
          { name: 'To', value: 'to@example.com' },
          { name: 'Subject', value: 'Test Subject' },
          { name: 'Date', value: '2026-06-01T10:00:00Z' },
        ],
        body: { data: 'UmVzcG9uZGVyIGF0w6kgMTAvMDYvMjAyNi4=' },
      },
    };

    mockGetMessage.mockResolvedValue(gmailMessage);
    mockGetHeader.mockImplementation((msg: typeof gmailMessage, name: string) => {
      const header = msg.payload.headers.find((h: { name: string }) => h.name === name);
      return header ? header.value : null;
    });
    mockExtractTextAndAttachments.mockReturnValue({
      text: 'Responder ate 10/06/2026.',
      attachments: [],
    });
    mockRedactExcerpt.mockImplementation((text: string) => text);
    mockBuildPersistedExcerpt.mockReturnValue('[short-body-redacted; sha256 stored]');

    const triageResult: EmailTriageResult = {
      categoria: 'juridico',
      resumo: 'E-mail sobre prazo processual.',
      ha_prazo: false,
      exige_validacao_humana: false,
      nivel_risco: 'baixo',
      confianca: 'alta',
      acao_recomendada: 'Encaminhar para juridico.',
      legal_basis: 'interesse_legitimo',
      processed_purpose: 'classificacao operacional de e-mail',
      resumo_anexos: [],
      source_evidence: [
        { tipo: 'corpo_email', referencia: 'body', trecho: 'Responder ate 10/06/2026.' },
      ],
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

    mockAnalyzeEmail.mockResolvedValue(triageResult);
    mockEnsureLabel.mockResolvedValue('label-id-123');
    mockMarkAsTriaged.mockResolvedValue(undefined);
    mockBuildCorrelationContext.mockResolvedValue({
      associate: { id: 1 },
      consultations: [{ id: 1 }],
    });
    mockApplyCorrelationActions.mockResolvedValue(undefined);

    const result = await processEmail('fake-token', 'msg-123');

    expect(result).toEqual({
      success: true,
      messageId: 'msg-123',
      categoria: 'juridico',
    });

    expect(mockMarkAsTriaged).toHaveBeenCalledWith('fake-token', 'msg-123', 'label-id-123', 'me');
    expect(mockApplyCorrelationActions).toHaveBeenCalled();
  });

  it('falls back to current date when Date header is empty', async () => {
    const gmailMessage = {
      id: 'msg-date-empty',
      threadId: 'thread-999',
      historyId: 'hist-111',
      payload: {
        headers: [
          { name: 'From', value: 'sender@example.com' },
          { name: 'To', value: 'to@example.com' },
          { name: 'Subject', value: 'Test Subject' },
          { name: 'Date', value: '' },
        ],
        body: { data: 'UmVzcG9uZGVyIGF0w6kgMTAvMDYvMjAyNi4=' },
      },
    };

    mockGetMessage.mockResolvedValue(gmailMessage);
    mockGetHeader.mockImplementation((msg: typeof gmailMessage, name: string) => {
      const header = msg.payload.headers.find((h: { name: string }) => h.name === name);
      return header ? header.value : null;
    });
    mockExtractTextAndAttachments.mockReturnValue({ text: 'Responder ate 10/06/2026.', attachments: [] });
    mockRedactExcerpt.mockImplementation((text: string) => text);
    mockBuildPersistedExcerpt.mockReturnValue('[short-body-redacted; sha256 stored]');

    const triageResult: EmailTriageResult = {
      categoria: 'juridico',
      resumo: 'E-mail sobre prazo processual.',
      ha_prazo: false,
      exige_validacao_humana: false,
      nivel_risco: 'baixo',
      confianca: 'alta',
      acao_recomendada: 'Encaminhar para juridico.',
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

    mockAnalyzeEmail.mockResolvedValue(triageResult);
    mockEnsureLabel.mockResolvedValue('label-id-123');
    mockMarkAsTriaged.mockResolvedValue(undefined);
    mockBuildCorrelationContext.mockResolvedValue({ associate: { id: 1 }, consultations: [{ id: 1 }] });
    mockApplyCorrelationActions.mockResolvedValue(undefined);

    const before = Date.now();
    const result = await processEmail('fake-token', 'msg-date-empty');
    const after = Date.now();

    expect(result).toEqual({ success: true, messageId: 'msg-date-empty', categoria: 'juridico' });

    // Assert persistTriage received a valid ISO date (not empty string)
    const persistCall = mockPersistTriage.mock.calls[0];
    const receivedAt = persistCall[0].received_at;
    const parsed = Date.parse(receivedAt);
    expect(Number.isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after + 1000);
  });

  it('notifies admins and skips correlation when triage requires human validation', async () => {
    const gmailMessage = {
      id: 'msg-needs-review',
      threadId: 'thread-review',
      historyId: 'hist-review',
      payload: {
        headers: [
          { name: 'From', value: 'sender@example.com' },
          { name: 'To', value: 'to@example.com' },
          { name: 'Subject', value: 'Urgent: prazo processual' },
          { name: 'Date', value: '2026-06-01T10:00:00Z' },
        ],
        body: { data: 'UmVzcG9uZGVyIGF0w6kgMTAvMDYvMjAyNi4=' },
      },
    };

    mockGetMessage.mockResolvedValue(gmailMessage);
    mockGetHeader.mockImplementation((msg: typeof gmailMessage, name: string) => {
      const header = msg.payload.headers.find((h: { name: string }) => h.name === name);
      return header ? header.value : null;
    });
    mockExtractTextAndAttachments.mockReturnValue({
      text: 'E-mail ambiguo que exige revisao operacional.',
      attachments: [],
    });
    mockRedactExcerpt.mockImplementation((text: string) => text);
    mockBuildPersistedExcerpt.mockReturnValue('[short-body-redacted; sha256 stored]');

    const triageResult: EmailTriageResult = {
      categoria: 'juridico',
      resumo: 'E-mail ambiguo que exige revisao operacional.',
      ha_prazo: false,
      exige_validacao_humana: true,
      nivel_risco: 'alto',
      confianca: 'baixa',
      acao_recomendada: 'Encaminhar para revisao operacional.',
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

    mockAnalyzeEmail.mockResolvedValue(triageResult);
    mockEnsureLabel.mockResolvedValue('label-id-123');
    mockMarkAsTriaged.mockResolvedValue(undefined);
    mockPersistTriage.mockResolvedValue(77);

    const result = await processEmail('fake-token', 'msg-needs-review');

    expect(result).toEqual({
      success: true,
      messageId: 'msg-needs-review',
      categoria: 'juridico',
    });
    expect(mockNotifyNeedsValidation).toHaveBeenCalledTimes(1);
    expect(mockNotifyNeedsValidation).toHaveBeenCalledWith(
      triageResult,
      77,
      expect.objectContaining({ message_id: 'msg-needs-review' }),
    );
    expect(mockBuildCorrelationContext).not.toHaveBeenCalled();
    expect(mockApplyCorrelationActions).not.toHaveBeenCalled();
  });

  it('returns error when Gmail fetch fails', async () => {
    mockGetMessage.mockRejectedValue(new Error('Network error'));

    const result = await processEmail('fake-token', 'msg-456');

    expect(result).toMatchObject({
      success: false,
      messageId: 'msg-456',
      error: expect.stringContaining('Gmail fetch failed'),
    });
  });

  it('returns error when Gemini analysis fails', async () => {
    const gmailMessage = {
      id: 'msg-789',
      threadId: 'thread-999',
      historyId: 'hist-111',
      payload: {
        headers: [
          { name: 'From', value: 'sender@example.com' },
          { name: 'To', value: 'to@example.com' },
          { name: 'Subject', value: 'Test Subject' },
          { name: 'Date', value: '2026-06-01T10:00:00Z' },
        ],
        body: { data: 'UmVzcG9uZGVyIGF0w6kgMTAvMDYvMjAyNi4=' },
      },
    };

    mockGetMessage.mockResolvedValue(gmailMessage);
    mockGetHeader.mockImplementation((msg: typeof gmailMessage, name: string) => {
      const header = msg.payload.headers.find((h: { name: string }) => h.name === name);
      return header ? header.value : null;
    });
    mockExtractTextAndAttachments.mockReturnValue({
      text: 'Responder ate 10/06/2026.',
      attachments: [],
    });
    mockRedactExcerpt.mockImplementation((text: string) => text);
    mockBuildPersistedExcerpt.mockReturnValue('[short-body-redacted; sha256 stored]');
    mockAnalyzeEmail.mockRejectedValue(new Error('Gemini timeout'));

    const result = await processEmail('fake-token', 'msg-789');

    expect(result).toMatchObject({
      success: false,
      messageId: 'msg-789',
      error: expect.stringContaining('Analysis failed'),
    });

    expect(mockPersistFailure).toHaveBeenCalled();
  });
});
