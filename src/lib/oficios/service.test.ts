import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  saveOfficialLetter,
  updateOfficialLetter,
  cancelOfficialLetter,
  generateOfficialLetterNumber,
  sendForSignature,
} from './service';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import { logAuditAction } from '@/lib/audit/service';
import type { NewOfficialLetter, OfficialLetter } from '@/lib/db/schema/oficios';

const transactionMock = vi.hoisted(() => ({ tx: { __tx: true } }));
const serviceMocks = vi.hoisted(() => ({
  dbTransaction: vi.fn(),
  loggerWarn: vi.fn(),
}));
const BASE_OFFICIAL_LETTER: OfficialLetter = {
  id: 12,
  number: 'OFÍCIO Nº 001/2026/ASOF',
  year: 2026,
  sequence: 1,
  recipient: 'Destinatário',
  recipientRole: 'Cargo',
  recipientAddress: null,
  recipientCity: null,
  recipientZip: null,
  vocativo: 'Senhor',
  letterDate: '13 de maio de 2026',
  subject: 'Assunto',
  itamaratySector: 'SGP',
  signatoryName: 'Nome',
  signatoryRole: 'Cargo',
  closure: 'Atenciosamente,',
  bodyRichText: 'Texto',
  bodyPlainText: 'Texto',
  pdfStoragePath: null,
  status: 'gerado',
  createdBy: 1,
  updatedBy: 1,
  createdAt: new Date('2026-05-13T10:00:00.000Z'),
  updatedAt: new Date('2026-05-13T11:00:00.000Z'),
  assinafyDocumentId: null,
  assinafyStatus: null,
  assinafyAssignmentId: null,
  assinafySignerId: null,
  assinafySentAt: null,
  assinafySignedAt: null,
  assinafyError: null,
  assinafySigningUrl: null,
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (...args: unknown[]) => serviceMocks.dbTransaction(...args),
  },
}));

vi.mock('./repository', () => ({
  getLastSequenceForYear: vi.fn().mockResolvedValue(0),
  createOfficialLetter: vi.fn(),
  findOfficialLetterById: vi.fn(),
  updateOfficialLetter: vi.fn(),
  cancelOfficialLetter: vi.fn(),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn(),
}));

const assinafyMocks = vi.hoisted(() => ({
  mockUploadDocument: vi.fn(),
  mockCreateSigner: vi.fn(),
  mockCreateAssignment: vi.fn(),
  mockGeneratePdf: vi.fn(),
  mockCleanSignatoryName: vi.fn(),
  mockClaimSubmission: vi.fn(),
  mockFinalizeSubmission: vi.fn(),
  mockFailSubmission: vi.fn(),
}));

vi.mock('@/lib/assinafy/client', () => {
  function MockAssinafyClient() {
    return {
      uploadDocument: assinafyMocks.mockUploadDocument,
      createSigner: assinafyMocks.mockCreateSigner,
      createAssignment: assinafyMocks.mockCreateAssignment,
    };
  }
  return { AssinafyClient: MockAssinafyClient };
});

vi.mock('@/lib/assinafy/repository', () => ({
  updateAssinafyFields: vi.fn(),
  claimAssinafySubmission: assinafyMocks.mockClaimSubmission,
  finalizeAssinafySubmission: assinafyMocks.mockFinalizeSubmission,
  failAssinafySubmission: assinafyMocks.mockFailSubmission,
}));

vi.mock('./pdf', () => ({
  generateOfficialLetterPdf: assinafyMocks.mockGeneratePdf,
}));

vi.mock('./utils', () => ({
  cleanSignatoryName: assinafyMocks.mockCleanSignatoryName,
}));

vi.mock('@/lib/env', () => ({
  env: {
    ASSINAFY_API_KEY: 'test-api-key',
    ASSINAFY_ACCOUNT_ID: 'test-account-id',
    ASSINAFY_BASE_URL: 'https://sandbox.assinafy.com.br/v1',
  },
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: (...args: unknown[]) => serviceMocks.loggerWarn(...args),
  }),
}));

describe('oficios service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.dbTransaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => callback(transactionMock.tx),
    );
    vi.mocked(logAuditAction).mockResolvedValue(undefined);

    process.env.ASSINAFY_API_KEY = 'test-api-key';
    process.env.ASSINAFY_ACCOUNT_ID = 'test-account-id';

    assinafyMocks.mockUploadDocument.mockResolvedValue({
      id: 'doc-123',
      name: 'test.pdf',
      status: 'pending',
    });
    assinafyMocks.mockCreateSigner.mockResolvedValue({
      id: 'signer-456',
      full_name: 'Clean Name',
      email: 'signer@test.com',
    });
    assinafyMocks.mockCreateAssignment.mockResolvedValue({
      id: 'assign-789',
      method: 'virtual',
      signers: [],
      signing_urls: [{ signer_id: 'signer-456', url: 'https://assinafy.com/sign/abc' }],
    });
    assinafyMocks.mockGeneratePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
    assinafyMocks.mockCleanSignatoryName.mockReturnValue('Clean Name');
    assinafyMocks.mockClaimSubmission.mockResolvedValue(BASE_OFFICIAL_LETTER);
    assinafyMocks.mockFinalizeSubmission.mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      assinafyDocumentId: 'doc-123',
      assinafyStatus: 'pending_signature',
    });
    assinafyMocks.mockFailSubmission.mockResolvedValue(BASE_OFFICIAL_LETTER);
  });

  it('emits an event when a generated official letter is created', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.createOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'gerado',
    });

    await saveOfficialLetter(
      {
        recipient: 'Destinatário',
        recipientRole: 'Cargo',
        vocativo: 'Senhor',
        letterDate: '13 de maio de 2026',
        subject: 'Assunto',
        itamaratySector: 'SGP',
        signatoryName: 'Nome',
        signatoryRole: 'Cargo',
        closure: 'Atenciosamente,',
        bodyRichText: 'Texto',
        bodyPlainText: 'Texto',
      },
      1,
    );

    expect(emitDomainEvent).toHaveBeenCalledOnce();
    expect(emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'official_letter.created',
        payload: expect.objectContaining({
          links: {
            app: '/app/secretaria/oficios/12',
          },
        }),
      }),
      transactionMock.tx,
    );
  });

  it('generates padded sequence number starting from last+1', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.getLastSequenceForYear).mockResolvedValue(5);

    const result = await generateOfficialLetterNumber(2026);
    expect(result).toEqual({ number: 'OFÍCIO Nº 006/2026/ASOF', sequence: 6 });
  });

  it('generates sequence 001 when no letters exist for the year', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.getLastSequenceForYear).mockResolvedValue(0);

    const result = await generateOfficialLetterNumber(2026);
    expect(result).toEqual({ number: 'OFÍCIO Nº 001/2026/ASOF', sequence: 1 });
  });

  it('does not emit event when a draft is created', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.createOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'rascunho',
    });

    await saveOfficialLetter(
      {
        recipient: 'Destinatário',
        recipientRole: 'Cargo',
        vocativo: 'Senhor',
        letterDate: '13 de maio de 2026',
        subject: 'Assunto',
        itamaratySector: 'SGP',
        signatoryName: 'Nome',
        signatoryRole: 'Cargo',
        closure: 'Atenciosamente,',
        bodyRichText: 'Texto',
        bodyPlainText: 'Texto',
      },
      1,
    );

    expect(emitDomainEvent).not.toHaveBeenCalled();
  });

  it('attempts create audit only after the transaction resolves', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.createOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'rascunho',
    });
    let releaseCommit!: () => void;
    const commitGate = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    let callbackFinished = false;
    serviceMocks.dbTransaction.mockImplementationOnce(async (callback) => {
      const value = await callback(transactionMock.tx);
      callbackFinished = true;
      await commitGate;
      return value;
    });

    const savePromise = saveOfficialLetter(
      {
        recipient: 'Destinatário',
        recipientRole: 'Cargo',
        vocativo: 'Senhor',
        letterDate: '13 de maio de 2026',
        subject: 'Assunto',
        itamaratySector: 'SGP',
        signatoryName: 'Nome',
        signatoryRole: 'Cargo',
        closure: 'Atenciosamente,',
        bodyRichText: 'Texto',
        bodyPlainText: 'Texto',
      },
      7,
    );

    await vi.waitFor(() => expect(callbackFinished).toBe(true));
    expect(logAuditAction).not.toHaveBeenCalled();
    releaseCommit();
    await expect(savePromise).resolves.toEqual(expect.objectContaining({ id: 12 }));
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 7,
        action: 'official_letter_created',
        entityType: 'official_letter',
        entityId: 12,
      }),
    );
    expect(vi.mocked(logAuditAction).mock.calls[0]![0].executor).toBeUndefined();
  });

  it('does not audit a create when the transactional outbox write fails', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.createOfficialLetter).mockResolvedValue(BASE_OFFICIAL_LETTER);
    vi.mocked(emitDomainEvent).mockRejectedValueOnce(new Error('outbox failed'));

    await expect(
      saveOfficialLetter(
        {
          recipient: 'Destinatário',
          recipientRole: 'Cargo',
          vocativo: 'Senhor',
          letterDate: '13 de maio de 2026',
          subject: 'Assunto',
          itamaratySector: 'SGP',
          signatoryName: 'Nome',
          signatoryRole: 'Cargo',
          closure: 'Atenciosamente,',
          bodyRichText: 'Texto',
          bodyPlainText: 'Texto',
        },
        1,
      ),
    ).rejects.toThrow('outbox failed');
    expect(logAuditAction).not.toHaveBeenCalled();
  });

  it('emits a published event when an existing draft transitions to gerado', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findOfficialLetterById).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'rascunho',
    });
    vi.mocked(repository.updateOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'gerado',
    });

    const partialUpdate: Partial<NewOfficialLetter> = { status: 'gerado' };

    await updateOfficialLetter(12, partialUpdate, 1);

    expect(emitDomainEvent).toHaveBeenCalledOnce();
    expect(emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'official_letter.published',
        payload: expect.objectContaining({
          links: {
            app: '/app/secretaria/oficios/12',
          },
        }),
      }),
      transactionMock.tx,
    );
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'official_letter_updated',
        entityId: 12,
      }),
    );
    expect(vi.mocked(logAuditAction).mock.calls[0]![0].executor).toBeUndefined();
  });

  it('does not audit an update when the repository fails', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);
    vi.mocked(repository.updateOfficialLetter).mockRejectedValueOnce(new Error('update failed'));

    await expect(updateOfficialLetter(12, { subject: 'Novo assunto' }, 1)).rejects.toThrow(
      'update failed',
    );
    expect(logAuditAction).not.toHaveBeenCalled();
  });

  it('cancels an official letter and logs audit action', async () => {
    const repository = await import('./repository');
    const audit = await import('@/lib/audit/service');

    vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);
    vi.mocked(repository.cancelOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'cancelado',
    });

    const result = await cancelOfficialLetter(12, 1);

    expect(result.status).toBe('cancelado');
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'official_letter_cancelled',
        entityId: 12,
      }),
    );
    expect(vi.mocked(logAuditAction).mock.calls[0]![0].executor).toBeUndefined();
  });

  it('preserves a committed cancellation and warns safely when audit rejects', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);
    vi.mocked(repository.cancelOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'cancelado',
    });
    vi.mocked(logAuditAction).mockRejectedValueOnce(new Error('recipient secret leaked'));

    await expect(cancelOfficialLetter(12, 1)).resolves.toEqual(
      expect.objectContaining({ status: 'cancelado' }),
    );
    expect(serviceMocks.loggerWarn).toHaveBeenCalledWith(
      'Audit log failed after committed official letter mutation',
      {
        action: 'official_letter_cancelled',
        entityType: 'official_letter',
        entityId: 12,
      },
    );
    expect(JSON.stringify(serviceMocks.loggerWarn.mock.calls)).not.toContain(
      'recipient secret leaked',
    );
  });

  it('throws when cancelling a non-existent letter', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findOfficialLetterById).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof repository.findOfficialLetterById>>,
    );

    await expect(cancelOfficialLetter(999, 1)).rejects.toThrow('Ofício não encontrado.');
  });

  describe('sendForSignature', () => {
    const SIGNER_EMAIL = 'signer@example.com';
    const USER_ID = 7;
    const OFICIO_ID = 12;

    it('succeeds when all steps complete', async () => {
      const repository = await import('./repository');
      const assinafyRepo = await import('@/lib/assinafy/repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      const updatedOficio = {
        ...BASE_OFFICIAL_LETTER,
        assinafyDocumentId: 'doc-123',
        assinafyStatus: 'pending_signature' as const,
      };
      assinafyMocks.mockFinalizeSubmission.mockResolvedValue(updatedOficio);

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(vi.mocked(repository.findOfficialLetterById)).toHaveBeenCalledWith(OFICIO_ID);
      expect(assinafyMocks.mockGeneratePdf).toHaveBeenCalledWith(BASE_OFFICIAL_LETTER);
      expect(assinafyMocks.mockCleanSignatoryName).toHaveBeenCalledWith(
        BASE_OFFICIAL_LETTER.signatoryName,
      );
      expect(assinafyMocks.mockUploadDocument).toHaveBeenCalledOnce();
      expect(assinafyMocks.mockUploadDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        'OFÍCIO_Nº_001_2026_ASOF.pdf',
      );
      expect(assinafyMocks.mockCreateSigner).toHaveBeenCalledWith('Clean Name', SIGNER_EMAIL);
      expect(assinafyMocks.mockCreateAssignment).toHaveBeenCalledWith(
        'doc-123',
        expect.objectContaining({ method: 'virtual' }),
      );
      expect(assinafyRepo.finalizeAssinafySubmission).toHaveBeenCalledWith(
        OFICIO_ID,
        expect.objectContaining({
          assinafyDocumentId: 'doc-123',
          assinafySigningUrl: 'https://assinafy.com/sign/abc',
          assinafyAssignmentId: 'assign-789',
          assinafySignerId: 'signer-456',
          updatedBy: USER_ID,
        }),
        expect.anything(),
      );
      expect(result).toEqual({ success: true, data: updatedOficio });
    });

    it('allows only one concurrent submission to reach the provider', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);
      assinafyMocks.mockClaimSubmission
        .mockResolvedValueOnce(BASE_OFFICIAL_LETTER)
        .mockResolvedValueOnce(null);

      const results = await Promise.all([
        sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID),
        sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID),
      ]);

      expect(results.filter((result) => result.success)).toHaveLength(1);
      expect(assinafyMocks.mockGeneratePdf).toHaveBeenCalledOnce();
      expect(assinafyMocks.mockUploadDocument).toHaveBeenCalledOnce();
      expect(assinafyMocks.mockCreateSigner).toHaveBeenCalledOnce();
      expect(assinafyMocks.mockCreateAssignment).toHaveBeenCalledOnce();
    });

    it('logs audit without executor (best-effort, outside tx)', async () => {
      const repository = await import('./repository');
      const audit = await import('@/lib/audit/service');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      const updatedOficio = {
        ...BASE_OFFICIAL_LETTER,
        assinafyDocumentId: 'doc-123',
        assinafyStatus: 'pending_signature' as const,
      };
      assinafyMocks.mockFinalizeSubmission.mockResolvedValue(updatedOficio);

      await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(audit.logAuditAction).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: USER_ID,
          action: 'official_letter_sent_for_signature',
          entityType: 'official_letter',
          entityId: OFICIO_ID,
        }),
      );
      const auditCall = vi.mocked(audit.logAuditAction).mock.calls.at(-1)![0];
      expect(auditCall.executor).toBeUndefined();
    });

    it('returns error when assinafy env vars are missing', async () => {
      const { env } = await import('@/lib/env');
      const originalApiKey = env.ASSINAFY_API_KEY;
      const originalAccountId = env.ASSINAFY_ACCOUNT_ID;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (env as any).ASSINAFY_API_KEY = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (env as any).ASSINAFY_ACCOUNT_ID = undefined;

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({
        success: false,
        error: 'Assinafy não está configurado. Verifique as variáveis de ambiente.',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (env as any).ASSINAFY_API_KEY = originalApiKey;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (env as any).ASSINAFY_ACCOUNT_ID = originalAccountId;
    });

    it('returns error when oficio is not found', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(
        null as unknown as Awaited<ReturnType<typeof repository.findOfficialLetterById>>,
      );

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({ success: false, error: 'Ofício não encontrado.' });
    });

    it('returns error when oficio status is not eligible', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue({
        ...BASE_OFFICIAL_LETTER,
        status: 'cancelado',
      });

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({
        success: false,
        error: 'Ofício com status "cancelado" não pode ser enviado para assinatura.',
      });
    });

    it('returns error when oficio already has assinafyDocumentId (idempotency)', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue({
        ...BASE_OFFICIAL_LETTER,
        assinafyDocumentId: 'doc-existing',
      });

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({
        success: false,
        error: 'Este ofício já foi enviado para assinatura.',
      });
    });

    it('returns error when PDF generation fails', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      assinafyMocks.mockGeneratePdf.mockRejectedValue(new Error('PDF error'));

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({ success: false, error: 'Falha ao enviar ofício para assinatura.' });
    });

    it('returns error when uploadDocument fails', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      assinafyMocks.mockUploadDocument.mockRejectedValue(new Error('Upload failed'));

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({ success: false, error: 'Falha ao enviar ofício para assinatura.' });
    });

    it('returns error when createSigner fails', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      assinafyMocks.mockCreateSigner.mockRejectedValue(new Error('Signer creation failed'));

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({ success: false, error: 'Falha ao enviar ofício para assinatura.' });
    });

    it('returns error when createAssignment fails', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      assinafyMocks.mockCreateAssignment.mockRejectedValue(new Error('Assignment failed'));

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({ success: false, error: 'Falha ao enviar ofício para assinatura.' });
    });

    it('returns error when signing_urls is empty', async () => {
      const repository = await import('./repository');
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      assinafyMocks.mockCreateAssignment.mockResolvedValue({
        id: 'assign-empty',
        method: 'virtual',
        signers: [],
        signing_urls: [],
      });

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(result).toEqual({
        success: false,
        error: 'Falha ao obter URL de assinatura. Recursos órfãos criados na Assinafy.',
      });
    });
  });
});
