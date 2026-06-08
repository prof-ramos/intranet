import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  saveOfficialLetter,
  updateOfficialLetter,
  cancelOfficialLetter,
  generateOfficialLetterNumber,
  sendForSignature,
} from './service';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import type { NewOfficialLetter, OfficialLetter } from '@/lib/db/schema/oficios';

const transactionMock = vi.hoisted(() => ({ tx: { __tx: true } }));
const BASE_OFFICIAL_LETTER: OfficialLetter = {
  id: 12,
number: 'Ofício nº 001/2026-ASOF',
  year: 2026,
  sequence: 1,
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
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(transactionMock.tx),
    ),
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
  createLogger: vi.fn().mockReturnValue({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

describe('oficios service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.ASSINAFY_API_KEY = 'test-api-key';
    process.env.ASSINAFY_ACCOUNT_ID = 'test-account-id';

    assinafyMocks.mockUploadDocument.mockResolvedValue({ id: 'doc-123', name: 'test.pdf', status: 'pending' });
    assinafyMocks.mockCreateSigner.mockResolvedValue({ id: 'signer-456', full_name: 'Clean Name', email: 'signer@test.com' });
    assinafyMocks.mockCreateAssignment.mockResolvedValue({
      id: 'assign-789',
      method: 'virtual',
      signers: [],
      signing_urls: [{ signer_id: 'signer-456', url: 'https://assinafy.com/sign/abc' }],
    });
    assinafyMocks.mockGeneratePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
    assinafyMocks.mockCleanSignatoryName.mockReturnValue('Clean Name');
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
    expect(result).toEqual({ number: 'Ofício nº 006/2026-ASOF', sequence: 6 });
  });

  it('generates sequence 001 when no letters exist for the year', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.getLastSequenceForYear).mockResolvedValue(0);

    const result = await generateOfficialLetterNumber(2026);
    expect(result).toEqual({ number: 'Ofício nº 001/2026-ASOF', sequence: 1 });
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
      vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);

      const assinafyRepo = await import('@/lib/assinafy/repository');
      const updatedOficio = { ...BASE_OFFICIAL_LETTER, assinafyDocumentId: 'doc-123', assinafyStatus: 'pending_signature' as const };
      vi.mocked(assinafyRepo.updateAssinafyFields).mockResolvedValue(updatedOficio);

      const result = await sendForSignature(OFICIO_ID, SIGNER_EMAIL, USER_ID);

      expect(vi.mocked(repository.findOfficialLetterById)).toHaveBeenCalledWith(OFICIO_ID);
      expect(assinafyMocks.mockGeneratePdf).toHaveBeenCalledWith(BASE_OFFICIAL_LETTER);
      expect(assinafyMocks.mockCleanSignatoryName).toHaveBeenCalledWith(BASE_OFFICIAL_LETTER.signatoryName);
      expect(assinafyMocks.mockUploadDocument).toHaveBeenCalledOnce();
      expect(assinafyMocks.mockUploadDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        'Ofício_nº_001_2026-ASOF.pdf',
      );
      expect(assinafyMocks.mockCreateSigner).toHaveBeenCalledWith('Clean Name', SIGNER_EMAIL);
      expect(assinafyMocks.mockCreateAssignment).toHaveBeenCalledWith('doc-123', expect.objectContaining({ method: 'virtual' }));
      expect(assinafyRepo.updateAssinafyFields).toHaveBeenCalledWith(
        OFICIO_ID,
        expect.objectContaining({
          assinafyDocumentId: 'doc-123',
          assinafyStatus: 'pending_signature',
          assinafySigningUrl: 'https://assinafy.com/sign/abc',
          assinafyAssignmentId: 'assign-789',
          assinafySignerId: 'signer-456',
          updatedBy: USER_ID,
        }),
        expect.anything(),
      );
      expect(result).toEqual({ success: true, data: updatedOficio });
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
