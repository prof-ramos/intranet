/* eslint-disable @typescript-eslint/no-explicit-any -- Drizzle mock chains require any for self-referencing builders */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { materializarNoDominio } from './domain-materializer';
import type { EmailPayload, EmailTriageResult } from './schema';

// ─── Module mocks ────────────────────────────────────────────────────────

const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: any[]) => mockDbSelect(...args),
    update: (...args: any[]) => mockDbUpdate(...args),
  },
}));

vi.mock('@/lib/db/schema/legal-consultations', () => ({ legalConsultations: {} }));
vi.mock('@/lib/db/schema/lawyers', () => ({ lawyers: {} }));
vi.mock('@/lib/db/schema/email-triage', () => ({ emailTriagens: {} }));

const mockCreateConsultationService = vi.fn();
vi.mock('@/lib/juridico/service', () => ({
  createConsultationService: (...args: any[]) => mockCreateConsultationService(...args),
}));

const mockCreateActivityService = vi.fn();
vi.mock('@/lib/activities/service', () => ({
  createActivityService: (...args: any[]) => mockCreateActivityService(...args),
}));

const mockResolveSystemBotUser = vi.fn();
vi.mock('@/lib/system-users', () => ({
  resolveSystemBotUser: (...args: any[]) => mockResolveSystemBotUser(...args),
}));

const mockBuildCorrelationContext = vi.fn();
vi.mock('./correlation-context', () => ({
  buildCorrelationContext: (...args: any[]) => mockBuildCorrelationContext(...args),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: any, val: any) => ({ eq: val })),
  and: vi.fn((...args: any[]) => ({ and: args })),
  inArray: vi.fn((_col: any, vals: any[]) => ({ inArray: vals })),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<EmailPayload> = {}): EmailPayload {
  return {
    message_id: 'msg-001',
    thread_id: 'thread-001',
    history_id: 'hist-001',
    received_at: '2026-06-01T10:00:00.000Z',
    sender: 'sender@example.com',
    original_recipient: 'asof@example.com',
    subject: 'Consulta sobre prazo',
    body_hash: 'abc123',
    body_excerpt: 'Corpo do e-mail.',
    analysis_excerpt: 'Análise do e-mail.',
    attachments: [],
    ...overrides,
  };
}

function makeResult(overrides: Partial<EmailTriageResult> = {}): EmailTriageResult {
  return {
    categoria: 'juridico',
    resumo: 'E-mail sobre prazo processual.',
    ha_prazo: false,
    exige_validacao_humana: false,
    nivel_risco: 'baixo',
    confianca: 'alta',
    acao_recomendada: 'Encaminhar para jurídico.',
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
    ...overrides,
  };
}

function makeSelectChain(rows: any[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(
        // Allow it to be awaited directly OR to have a .limit() method
        Object.assign(Promise.resolve(rows), {
          limit: vi.fn().mockResolvedValue(rows),
        })
      ),
    }),
  };
}

function makeUpdateChain() {
  const whereMock = vi.fn().mockResolvedValue(undefined);
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  return { set: setMock, where: whereMock, _setMock: setMock };
}

// ─── Default happy-path setup ─────────────────────────────────────────────

function setupDefaultHappyPath(consultationId = 42) {
  mockResolveSystemBotUser.mockResolvedValue(99);
  mockBuildCorrelationContext.mockResolvedValue({ associate: null, consultations: [] });
  mockCreateConsultationService.mockResolvedValue({ id: consultationId });
  mockCreateActivityService.mockResolvedValue(undefined);
  // idempotency → not yet materialized; lawyers → empty; thread → empty
  mockDbSelect
    .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
    .mockReturnValueOnce(makeSelectChain([]))
    .mockReturnValueOnce(makeSelectChain([]));
  mockDbUpdate.mockReturnValue(makeUpdateChain());
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('materializarNoDominio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna sem fazer nada para categoria !== juridico', async () => {
    const payload = makePayload();
    const result = makeResult({ categoria: 'administrativo' });

    await materializarNoDominio(payload, result, 1);

    expect(mockResolveSystemBotUser).not.toHaveBeenCalled();
    expect(mockCreateConsultationService).not.toHaveBeenCalled();
    expect(mockCreateActivityService).not.toHaveBeenCalled();
  });

  it('identifica advogado pelo advogado_email extraído pela IA', async () => {
    const payload = makePayload({ sender: 'sender@example.com' });
    const result = makeResult({ advogado_email: 'advogado@escritorio.com' });

    mockResolveSystemBotUser.mockResolvedValue(99);
    mockBuildCorrelationContext.mockResolvedValue({ associate: null, consultations: [] });
    mockCreateConsultationService.mockResolvedValue({ id: 10 });
    mockCreateActivityService.mockResolvedValue(undefined);
    mockDbUpdate.mockReturnValue(makeUpdateChain());

    // idempotency → not yet materialized; advogado_email → id=7; thread → empty
    mockDbSelect
      .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
      .mockReturnValueOnce(makeSelectChain([{ id: 7, email: 'advogado@escritorio.com' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    await materializarNoDominio(payload, result, 1);

    expect(mockCreateConsultationService).toHaveBeenCalledWith(
      expect.objectContaining({ lawyerId: 7 }),
    );
  });

  it('usa sender como fallback quando advogado_email é null', async () => {
    const payload = makePayload({ sender: 'advogado-sender@escritorio.com' });
    const result = makeResult({ advogado_email: null });

    mockResolveSystemBotUser.mockResolvedValue(99);
    mockBuildCorrelationContext.mockResolvedValue({ associate: null, consultations: [] });
    mockCreateConsultationService.mockResolvedValue({ id: 20 });
    mockCreateActivityService.mockResolvedValue(undefined);
    mockDbUpdate.mockReturnValue(makeUpdateChain());

    // idempotency → not yet materialized; sender → id=5; thread → empty
    mockDbSelect
      .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
      .mockReturnValueOnce(makeSelectChain([{ id: 5, email: 'advogado-sender@escritorio.com' }]))
      .mockReturnValueOnce(makeSelectChain([]));

    await materializarNoDominio(payload, result, 2);

    expect(mockCreateConsultationService).toHaveBeenCalledWith(
      expect.objectContaining({ lawyerId: 5 }),
    );
  });

  it('cria nova Consulta Jurídica quando não há consulta existente', async () => {
    const payload = makePayload({ subject: 'Novo processo judicial', thread_id: 'thread-new' });
    const result = makeResult();

    mockResolveSystemBotUser.mockResolvedValue(99);
    mockBuildCorrelationContext.mockResolvedValue({ associate: { id: 3 }, consultations: [] });
    mockCreateConsultationService.mockResolvedValue({ id: 55 });
    mockCreateActivityService.mockResolvedValue(undefined);
    // idempotency → not yet materialized; lawyers → empty; thread → empty; associate-only → empty
    mockDbSelect
      .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));
    mockDbUpdate.mockReturnValue(makeUpdateChain());

    await materializarNoDominio(payload, result, 3);

    expect(mockCreateConsultationService).toHaveBeenCalledOnce();
    expect(mockCreateConsultationService).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-new',
        associateId: 3,
        slaDays: 5,
        createdBy: 99,
      }),
    );
  });

  it('vincula a consulta existente quando threadId coincide', async () => {
    const payload = makePayload({ thread_id: 'thread-existing' });
    const result = makeResult();

    mockResolveSystemBotUser.mockResolvedValue(99);
    mockBuildCorrelationContext.mockResolvedValue({ associate: null, consultations: [] });
    mockCreateActivityService.mockResolvedValue(undefined);

    const updateChain = makeUpdateChain();
    mockDbUpdate.mockReturnValue(updateChain);

    // idempotency → not yet materialized; lawyers → empty; thread → id=88
    mockDbSelect
      .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ id: 88 }]));

    await materializarNoDominio(payload, result, 4);

    expect(mockCreateConsultationService).not.toHaveBeenCalled();
    // Atividade não deve ser criada para e-mails de follow-up (isNewConsultation=false)
    expect(mockCreateActivityService).not.toHaveBeenCalled();
    // db.update deve ter sido chamado (para legalConsultations e emailTriagens)
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it('cria Atividade com dueDate = received_at + 5 dias', async () => {
    const receivedAt = '2026-06-01T10:00:00.000Z';
    const payload = makePayload({ received_at: receivedAt });
    const result = makeResult();

    setupDefaultHappyPath(60);

    await materializarNoDominio(payload, result, 5);

    expect(mockCreateActivityService).toHaveBeenCalledOnce();
    const call = mockCreateActivityService.mock.calls[0][0];
    const dueDate = new Date(call.dueDate);
    const expected = new Date(receivedAt);
    expected.setDate(expected.getDate() + 5);
    expect(dueDate.toDateString()).toBe(expected.toDateString());
  });

  it('usa prioridade urgente para nivel_risco alto ou critico', async () => {
    // alto
    setupDefaultHappyPath(70);
    await materializarNoDominio(makePayload(), makeResult({ nivel_risco: 'alto' }), 6);
    expect(mockCreateActivityService).toHaveBeenLastCalledWith(
      expect.objectContaining({ priority: 'urgente' }),
    );

    vi.clearAllMocks();

    // critico
    setupDefaultHappyPath(71);
    await materializarNoDominio(makePayload(), makeResult({ nivel_risco: 'critico' }), 7);
    expect(mockCreateActivityService).toHaveBeenLastCalledWith(
      expect.objectContaining({ priority: 'urgente' }),
    );

    vi.clearAllMocks();

    // baixo → normal
    setupDefaultHappyPath(72);
    await materializarNoDominio(makePayload(), makeResult({ nivel_risco: 'baixo' }), 8);
    expect(mockCreateActivityService).toHaveBeenLastCalledWith(
      expect.objectContaining({ priority: 'normal' }),
    );
  });

  it('atualiza email_triagens com consultationId e lawyerId', async () => {
    const payload = makePayload();
    const result = makeResult({ advogado_email: null });

    mockResolveSystemBotUser.mockResolvedValue(99);
    mockBuildCorrelationContext.mockResolvedValue({ associate: null, consultations: [] });
    mockCreateConsultationService.mockResolvedValue({ id: 42 });
    mockCreateActivityService.mockResolvedValue(undefined);
    // idempotency → not yet materialized; lawyers → empty; thread → empty
    mockDbSelect
      .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const setCalls: any[][] = [];
    mockDbUpdate.mockReturnValue({
      set: vi.fn((...args: any[]) => {
        setCalls.push(args);
        return { where: vi.fn().mockResolvedValue(undefined) };
      }),
    });

    await materializarNoDominio(payload, result, 9);

    const triageSetCall = setCalls.find((args) => args[0]?.consultationId === 42);
    expect(triageSetCall).toBeDefined();
  });

  it('continua sem associado quando buildCorrelationContext falha', async () => {
    const payload = makePayload();
    const result = makeResult();

    mockResolveSystemBotUser.mockResolvedValue(99);
    mockBuildCorrelationContext.mockRejectedValue(new Error('Correlation error'));
    mockCreateConsultationService.mockResolvedValue({ id: 50 });
    mockCreateActivityService.mockResolvedValue(undefined);
    // idempotency → not yet materialized; lawyers → empty; thread → empty
    mockDbSelect
      .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));
    mockDbUpdate.mockReturnValue(makeUpdateChain());

    await expect(materializarNoDominio(payload, result, 10)).resolves.toBeUndefined();

    expect(mockCreateConsultationService).toHaveBeenCalledWith(
      expect.objectContaining({ associateId: null }),
    );
  });

  it('não propaga erro quando createConsultationService falha', async () => {
    const payload = makePayload();
    const result = makeResult();

    mockResolveSystemBotUser.mockResolvedValue(99);
    mockBuildCorrelationContext.mockResolvedValue({ associate: null, consultations: [] });
    mockCreateConsultationService.mockRejectedValue(new Error('DB timeout'));
    mockCreateActivityService.mockResolvedValue(undefined);
    // idempotency → not yet materialized; lawyers → empty; thread → empty
    mockDbSelect
      .mockReturnValueOnce(makeSelectChain([{ consultationId: null }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));
    mockDbUpdate.mockReturnValue(makeUpdateChain());

    await expect(materializarNoDominio(payload, result, 11)).resolves.toBeUndefined();

    // Atividade não deve ser criada se a consulta falhou (isNewConsultation=false)
    expect(mockCreateActivityService).not.toHaveBeenCalled();
  });

  it('pula materialização quando email já foi processado (consultationId preenchido)', async () => {
    const payload = makePayload();
    const result = makeResult();

    // idempotency → já materializado
    mockDbSelect.mockReturnValueOnce(makeSelectChain([{ consultationId: 99 }]));

    await materializarNoDominio(payload, result, 12);

    expect(mockResolveSystemBotUser).not.toHaveBeenCalled();
    expect(mockCreateConsultationService).not.toHaveBeenCalled();
    expect(mockCreateActivityService).not.toHaveBeenCalled();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });
});
